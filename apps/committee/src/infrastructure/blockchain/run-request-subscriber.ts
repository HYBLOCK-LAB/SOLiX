import { bytesToHex, type PublicClient } from "viem";
import { licenseManagerAbi } from "./license-manager-abi";
import { logger } from "../../shared/logger";
import type { RunRequestProcessor } from "../../application/services/run-request-processor";

export class RunRequestSubscriber {
  private unwatch?: () => void;
  private currentClient: PublicClient;
  private usePolling: boolean;

  constructor(
    private readonly httpClient: PublicClient,
    private readonly wsClient: PublicClient | undefined,
    private readonly licenseContractAddress: `0x${string}`,
    private readonly processor: RunRequestProcessor,
    private readonly pollingIntervalMs: number
  ) {
    this.currentClient = wsClient ?? httpClient;
    this.usePolling = !wsClient;
  }

  start() {
    if (this.unwatch) {
      return;
    }

    this.watch();
    logger.info(
      this.usePolling
        ? "RunRequested subscriber started (HTTP polling)"
        : "RunRequested subscriber started (WebSocket)"
    );
  }

  private watch() {
    this.unwatch = this.currentClient.watchContractEvent({
      address: this.licenseContractAddress,
      abi: licenseManagerAbi,
      eventName: "RunRequested",
      ...(this.usePolling && this.pollingIntervalMs > 0
        ? { pollingInterval: this.pollingIntervalMs }
        : {}),
      onError: (error) => this.handleError(error),
      onLogs: async (logs) => {
        for (const log of logs) {
          const args = log.args as Record<string, unknown>;
          if (!args) continue;

          const codeId =
            typeof args.codeId === "bigint"
              ? args.codeId
              : BigInt(args.codeId as string);
          const requester =
            typeof args.user === "string"
              ? (args.user as `0x${string}`)
              : ((args.user?.toString?.() ?? "0x0") as `0x${string}`);

          if (!args.runNonce) {
            logger.warn(
              { codeId: codeId.toString(), requester },
              "Missing runNonce on RunRequested event"
            );
            continue;
          }

          const runNonceValue =
            typeof args.runNonce === "bigint"
              ? args.runNonce
              : BigInt(args.runNonce as string);
          const runNonceHex = this.formatBytes32(runNonceValue);
          const timestamp = await this.resolveTimestamp(log);

          const recipientPubKey = this.parseRecipientPubKey(
            args.recipientPubKey
          );
          if (!recipientPubKey) {
            logger.warn(
              { codeId: codeId.toString(), requester },
              "Missing recipientPubKey on RunRequested event"
            );
            continue;
          }

          await this.processor.process({
            codeId,
            requester,
            runNonce: runNonceHex,
            recipientPubKey,
            requestedAt: new Date(timestamp),
          });
        }
      },
    });
  }

  stop() {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = undefined;
      logger.info("RunRequested subscriber stopped");
    }
  }

  private async resolveTimestamp(log: {
    blockNumber?: bigint | null;
  }): Promise<number> {
    if (!log.blockNumber) {
      return Date.now();
    }

    try {
      const block = await this.currentClient.getBlock({
        blockNumber: log.blockNumber,
      });
      return Number(block.timestamp) * 1000;
    } catch (error) {
      logger.warn(
        { err: error, blockNumber: log.blockNumber },
        "Failed to fetch block timestamp"
      );
      return Date.now();
    }
  }

  private formatBytes32(value: bigint): `0x${string}` {
    const hex = value.toString(16).padStart(64, "0");
    return `0x${hex}` as `0x${string}`;
  }

  private parseRecipientPubKey(pubKey: unknown): `0x${string}` | undefined {
    if (typeof pubKey === "string") {
      return (
        pubKey.startsWith("0x") ? pubKey : `0x${pubKey}`
      ) as `0x${string}`;
    }
    if (pubKey instanceof Uint8Array) {
      return bytesToHex(pubKey) as `0x${string}`;
    }
    return undefined;
  }

  private handleError(error: unknown) {
    logger.error({ err: error }, "Error while processing RunRequested event");
    if (!this.usePolling && this.wsClient && this.shouldFallback(error)) {
      logger.warn(
        { err: error },
        "WebSocket subscription error; switching to HTTP polling"
      );
      this.switchToPolling();
    }
  }

  private switchToPolling() {
    if (this.usePolling) return;
    if (this.unwatch) {
      try {
        this.unwatch();
      } catch {
        // ignore
      }
      this.unwatch = undefined;
    }
    this.usePolling = true;
    this.currentClient = this.httpClient;
    this.watch();
    logger.info("RunRequested subscriber restarted with HTTP polling");
  }

  private shouldFallback(error: unknown): boolean {
    if (!error) return false;
    const name = (error as { name?: string }).name ?? "";
    const message = ((error as Error)?.message ?? "").toLowerCase();
    if (name === "WebSocketRequestError" || name === "SocketClosedError") {
      return true;
    }
    return message.includes("429") || message.includes("too many requests");
  }
}
