import { bytesToHex, type PublicClient } from "viem";
import { licenseManagerAbi } from "./license-manager-abi";
import { committeeAbi } from "./committee-abi";
import type { HandleRunRequested } from "../../application/use-cases/handle-run-requested";
import type { ShardRepository } from "../../domain/repositories/shard-repository";
import type { ShardSubmissionQueue } from "../queue/shard-submission-queue";
import { logger } from "../../shared/logger";

export class RunRequestSubscriber {
  private unwatch?: () => void;

  constructor(
    private readonly client: PublicClient,
    private readonly licenseContractAddress: `0x${string}`,
    private readonly committeeContractAddress: `0x${string}`,
    private readonly handler: HandleRunRequested,
    private readonly pollingIntervalMs: number,
    private readonly shardRepository: ShardRepository,
    private readonly shardSubmissionQueue: ShardSubmissionQueue,
    private readonly committeeAddress: `0x${string}`
  ) {}
  private cachedThreshold?: number;

  start() {
    if (this.unwatch) {
      return;
    }

    this.unwatch = this.client.watchContractEvent({
      address: this.licenseContractAddress,
      abi: licenseManagerAbi,
      eventName: "RunRequested",
      pollingInterval: this.pollingIntervalMs,
      onError: (error) => {
        logger.error({ err: error }, "Error while processing RunRequested event");
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          const args = log.args as Record<string, unknown>;
          if (!args) continue;

          const codeId = typeof args.codeId === "bigint" ? args.codeId : BigInt(args.codeId as string);
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
            typeof args.runNonce === "bigint" ? args.runNonce : BigInt(args.runNonce as string);
          const runNonceHex = this.formatBytes32(runNonceValue);
          const thresholdValue = await this.resolveThreshold();

          const timestamp = await this.resolveTimestamp(log);

          const run = await this.handler.execute({
            runId: this.buildRunKey(codeId, requester, runNonceHex),
            codeId,
            runNonce: runNonceValue,
            threshold: thresholdValue,
            requester,
            requestedAt: new Date(timestamp),
          });

          const recipientPubKey = this.parseRecipientPubKey(args.recipientPubKey);

          if (!recipientPubKey) {
            logger.warn(
              { codeId: run.codeId.toString(), requester: run.requester },
              "Missing recipientPubKey on RunRequested event"
            );
            continue;
          }

          const shard = await this.shardRepository.findForCommittee(
            run.codeId.toString(),
            run.requester,
            runNonceHex,
            this.committeeAddress
          );
          if (!shard) {
            logger.debug({ codeId: run.codeId.toString(), requester: run.requester }, "No shard assigned to this committee for run");
            continue;
          }

          await this.shardSubmissionQueue.enqueue({
            codeId: shard.codeId,
            recipientPubKey,
            requester: run.requester,
            runNonce: runNonceHex,
          });
        }
      },
    });

    logger.info("RunRequested subscriber started");
  }

  stop() {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = undefined;
      logger.info("RunRequested subscriber stopped");
    }
  }

  private async resolveTimestamp(log: { blockNumber?: bigint }): Promise<number> {
    if (!log.blockNumber) {
      return Date.now();
    }

    try {
      const block = await this.client.getBlock({ blockNumber: log.blockNumber });
      return Number(block.timestamp) * 1000;
    } catch (error) {
      logger.warn({ err: error, blockNumber: log.blockNumber }, "Failed to fetch block timestamp");
      return Date.now();
    }
  }

  private buildRunKey(codeId: bigint, requester: `0x${string}`, runNonce: `0x${string}`): string {
    return `${codeId.toString()}:${requester.toLowerCase()}:${runNonce}`;
  }

  private parseRecipientPubKey(value: unknown): `0x${string}` | null {
    if (!value) return null;
    if (typeof value === "string") {
      return value.startsWith("0x") ? (value as `0x${string}`) : (`0x${value}` as `0x${string}`);
    }
    if (value instanceof Uint8Array) {
      return bytesToHex(value);
    }
    if (Array.isArray(value) && typeof (value as any).toString === "function") {
      try {
        const buffer = Uint8Array.from(value as number[]);
        return bytesToHex(buffer);
      } catch {
        return null;
      }
    }
    return null;
  }

  private formatBytes32(value: bigint): `0x${string}` {
    const hex = value.toString(16).padStart(64, "0");
    return `0x${hex}` as `0x${string}`;
  }

  private async resolveThreshold(): Promise<number> {
    if (this.cachedThreshold && this.cachedThreshold > 0) {
      return this.cachedThreshold;
    }
    try {
      const threshold = await this.client.readContract({
        address: this.committeeContractAddress,
        abi: committeeAbi,
        functionName: "committeeThreshold",
      });
      const value = Number(threshold);
      if (Number.isFinite(value) && value > 0) {
        this.cachedThreshold = value;
        return value;
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch committee threshold");
    }
    if (!this.cachedThreshold || this.cachedThreshold <= 0) {
      this.cachedThreshold = 1;
      logger.warn(
        { fallback: this.cachedThreshold },
        "Falling back to default committee threshold"
      );
    }
    return this.cachedThreshold;
  }
}
