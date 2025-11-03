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

          const timestamp =
            typeof log.blockTimestamp === "bigint"
              ? Number(log.blockTimestamp) * 1000
              : log.blockTimestamp
              ? Number(log.blockTimestamp)
              : Date.now();

          await this.handler.execute({
            runId,
            codeId,
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
}
