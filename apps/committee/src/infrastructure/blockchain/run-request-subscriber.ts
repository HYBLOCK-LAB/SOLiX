import type { PublicClient } from "viem";
import { committeeAbi } from "./committee-abi";
import type { HandleRunRequested } from "../../application/use-cases/handle-run-requested";
import { logger } from "../../shared/logger";

export class RunRequestSubscriber {
  private unwatch?: () => void;

  constructor(
    private readonly client: PublicClient,
    private readonly contractAddress: `0x${string}`,
    private readonly handler: HandleRunRequested
  ) {}

  start() {
    if (this.unwatch) {
      return;
    }

    this.unwatch = this.client.watchContractEvent({
      address: this.contractAddress,
      abi: committeeAbi,
      eventName: "RunRequested",
      onError: (error) => {
        logger.error({ err: error }, "Error while processing RunRequested event");
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          const args = log.args as Record<string, unknown>;
          if (!args) continue;

          const runId = typeof args.runId === "string" ? args.runId : (args.runId as `0x${string}`);
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

          await this.handler.execute({
            runId,
            codeId,
            shardNonce,
            threshold: thresholdValue,
            requester,
            requestedAt: new Date(timestamp),
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
}
