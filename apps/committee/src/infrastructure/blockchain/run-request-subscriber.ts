import { bytesToHex, type PublicClient } from "viem";
import { committeeAbi } from "./committee-abi";
import type { HandleRunRequested } from "../../application/use-cases/handle-run-requested";
import type { ShardRepository } from "../../domain/repositories/shard-repository";
import type { ShardSubmissionQueue } from "../queue/shard-submission-queue";
import { logger } from "../../shared/logger";

export class RunRequestSubscriber {
  private unwatch?: () => void;

  constructor(
    private readonly client: PublicClient,
    private readonly contractAddress: `0x${string}`,
    private readonly handler: HandleRunRequested,
    private readonly pollingIntervalMs: number,
    private readonly shardRepository: ShardRepository,
    private readonly shardSubmissionQueue: ShardSubmissionQueue,
    private readonly committeeAddress: `0x${string}`
  ) {}

  start() {
    if (this.unwatch) {
      return;
    }

    this.unwatch = this.client.watchContractEvent({
      address: this.contractAddress,
      abi: committeeAbi,
      eventName: "RunRequested",
      pollingInterval: this.pollingIntervalMs,
      onError: (error) => {
        logger.error({ err: error }, "Error while processing RunRequested event");
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          const args = log.args as Record<string, unknown>;
          if (!args) continue;

          const runId = typeof args.runId === "string" ? (args.runId as `0x${string}`) : (args.runId as `0x${string}`);
          const codeId = typeof args.codeId === "bigint" ? args.codeId : BigInt(args.codeId as string);
          const shardNonce =
            typeof args.shardNonce === "bigint" ? args.shardNonce : BigInt(args.shardNonce as string);
          const thresholdValue =
            typeof args.threshold === "bigint"
              ? Number(args.threshold)
              : Number(args.threshold ?? 0);
          if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
            logger.warn({ runId, threshold: args.threshold }, "Invalid threshold from event, skipping run");
            continue;
          }
          const requester =
            typeof args.requester === "string"
              ? (args.requester as `0x${string}`)
              : ((args.requester?.toString?.() ?? "0x0") as `0x${string}`);

          const timestamp = await this.resolveTimestamp(log);

          const run = await this.handler.execute({
            runId,
            codeId,
            shardNonce,
            threshold: thresholdValue,
            requester,
            requestedAt: new Date(timestamp),
          });

          const recipientPubKey = this.parseRecipientPubKey(args.recipientPubKey);

          if (!recipientPubKey) {
            logger.warn({ runId }, "Missing recipientPubKey on RunRequested event");
            continue;
          }

          const shard = await this.shardRepository.findByRun(
            run.runId,
            run.codeId.toString(),
            this.committeeAddress
          );
          if (!shard) {
            logger.debug({ runId }, "No shard assigned to this committee for run");
            continue;
          }

          await this.shardSubmissionQueue.enqueue({
            runId: run.runId,
            codeId: shard.codeId,
            runNonce: shard.shardNonce as `0x${string}`,
            recipientPubKey,
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
}
