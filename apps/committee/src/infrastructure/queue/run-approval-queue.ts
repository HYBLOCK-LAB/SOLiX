import { Queue, Worker, QueueEvents, type JobsOptions } from "bullmq";
import type { RedisOptions } from "ioredis";
import IORedis from "ioredis";
import { logger } from "../../shared/logger";

const QUEUE_NAME = "run-approval";

export class RunApprovalQueue {
  private readonly queue: Queue;
  private readonly events: QueueEvents;
  private worker?: Worker;

  constructor(redisUrl: string) {
    const connectionOptions: RedisOptions = { lazyConnect: false, maxRetriesPerRequest: null };

    this.queue = new Queue(QUEUE_NAME, {
      connection: new IORedis(redisUrl, connectionOptions),
    });

    this.events = new QueueEvents(QUEUE_NAME, {
      connection: new IORedis(redisUrl, connectionOptions),
    });

    this.events.on("failed", ({ jobId, failedReason }) => {
      logger.error({ jobId, failedReason }, "Run approval job failed");
    });
  }

  async enqueue(runId: string, options?: JobsOptions) {
    try {
      await this.queue.add(
        "approve",
        { runId },
        {
          jobId: runId,
          attempts: 3,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: true,
          ...options,
        }
      );
    } catch (error) {
      if ((error as Error).message.includes("Job") && (error as Error).message.includes("already exists")) {
        logger.debug({ runId }, "Approval job already enqueued");
        return;
      }
      throw error;
    }
  }

  startWorker(process: (runId: string) => Promise<void>) {
    if (this.worker) return;

    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const runId = job.data.runId as string;
        await process(runId);
      },
      {
        connection: this.queue.client,
      }
    );

    this.worker.on("completed", ({ id }) => {
      logger.info({ jobId: id }, "Run approval job completed");
    });

    this.worker.on("failed", ({ id, failedReason }) => {
      logger.error({ jobId: id, failedReason }, "Run approval job processing failed");
    });
  }

  async shutdown() {
    await Promise.all([
      this.worker?.close().catch((error) => logger.error({ err: error }, "Failed to close worker")),
      this.queue.close().catch((error) => logger.error({ err: error }, "Failed to close queue")),
      this.events.close().catch((error) => logger.error({ err: error }, "Failed to close queue events")),
    ]);
  }
}
