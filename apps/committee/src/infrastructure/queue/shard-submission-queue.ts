import { Queue, Worker, QueueEvents, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import type { RedisOptions } from "ioredis";
import { logger } from "../../shared/logger";

export interface ShardSubmissionJob {
  codeId: string;
  recipientPubKey: `0x${string}`;
  requester: `0x${string}`;
  runNonce: `0x${string}`;
}

export class ShardSubmissionQueue {
  private readonly queue: Queue<ShardSubmissionJob>;
  private readonly events: QueueEvents;
  private readonly connectionOptions: RedisOptions;
  private worker?: Worker<ShardSubmissionJob>;

  constructor(
    redisUrl: string,
    queueName: string
  ) {
    this.connectionOptions = { lazyConnect: false, maxRetriesPerRequest: null };
    this.queue = new Queue(queueName, {
      connection: new IORedis(redisUrl, this.connectionOptions),
    });

    this.events = new QueueEvents(queueName, {
      connection: new IORedis(redisUrl, this.connectionOptions),
    });
  }

  async enqueue(job: ShardSubmissionJob, options?: JobsOptions) {
    const normalizedNonce = job.runNonce.toLowerCase();
    await this.queue.add("submit", job, {
      removeOnComplete: true,
      removeOnFail: 50,
      jobId: `${job.codeId}:${job.requester}:${normalizedNonce}`,
      ...options,
    });
  }

  startWorker(process: (job: ShardSubmissionJob) => Promise<void>) {
    if (this.worker) return;

    this.worker = new Worker(
      this.queue.name,
      async (job) => {
        try {
          await process(job.data);
        } catch (error) {
          logger.error(
            {
              queue: this.queue.name,
              jobId: job.id,
              data: job.data,
              err: error,
            },
            "Shard submission job failed"
          );
          throw error;
        }
      },
      {
        connection: this.queue.opts.connection,
      }
    );
  }

  async shutdown() {
    await Promise.all([
      this.worker?.close().catch(() => undefined),
      this.queue.close().catch(() => undefined),
      this.events.close().catch(() => undefined),
    ]);
  }
}
