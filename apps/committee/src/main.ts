import { Redis } from "ioredis";
import { env } from "./config/env";
import { logger } from "./shared/logger";
import { createViemClients } from "./infrastructure/blockchain/viem-clients";
import { RedisRunRepository } from "./infrastructure/cache/redis-run-repository";
import { HandleRunRequested } from "./application/use-cases/handle-run-requested";
import { RunRequestSubscriber } from "./infrastructure/blockchain/run-request-subscriber";
import { SubmitShard } from "./application/use-cases/submit-shard";
import { GetRunStatus } from "./application/use-cases/get-run-status";
import { HttpServer } from "./interfaces/http/http-server";
import { RunController } from "./interfaces/http/controllers/run-controller";
import { PrepareSecretShards } from "./application/use-cases/prepare-secret-shards";
import { RedisShardRepository } from "./infrastructure/cache/redis-shard-repository";
import { EcdhShardEncryptor } from "./infrastructure/crypto/ecdh-shard-encryptor";
import { PinataShardPublisher } from "./infrastructure/storage/pinata-shard-publisher";
import { BlockchainShardSubmitter } from "./infrastructure/blockchain/shard-submitter";
import { ShardSubmissionQueue } from "./infrastructure/queue/shard-submission-queue";
import { ShardSubmissionWorker } from "./application/workers/shard-submission-worker";

async function bootstrap() {
  logger.info("Bootstrapping committee backend");

  const redis = new Redis(env.redisUrl);
  const runRepository = new RedisRunRepository(redis, env.runTtlSeconds);
  const shardRepository = new RedisShardRepository(redis, env.runTtlSeconds);

  if (!env.pinataJwt) {
    throw new Error("PINATA_JWT is required for shard publishing");
  }

  const { publicClient, walletClient, account } = createViemClients(env);
  const committeeId = env.committeeId;

  const shardEncryptor = new EcdhShardEncryptor();
  const shardPublisher = new PinataShardPublisher(env.pinataJwt);
  const shardSubmitter = new BlockchainShardSubmitter(walletClient, publicClient, env.contractAddress, account);
  const shardQueueName = `shard-submission:${committeeId}`;
  const shardSubmissionQueue = new ShardSubmissionQueue(env.redisUrl, shardQueueName);
  const shardWorker = new ShardSubmissionWorker(
    shardRepository,
    shardEncryptor,
    shardPublisher,
    shardSubmitter,
    account.address
  );
  shardSubmissionQueue.startWorker(async (job) => shardWorker.process(job));

  const prepareSecretShards = new PrepareSecretShards(runRepository, shardRepository);

  const handleRunRequested = new HandleRunRequested(runRepository);
  const runRequestSubscriber = new RunRequestSubscriber(
    publicClient,
    env.contractAddress,
    handleRunRequested,
    env.eventPollIntervalMs,
    shardRepository,
    shardSubmissionQueue,
    account.address
  );
  runRequestSubscriber.start();

  const submitShard = new SubmitShard(runRepository);
  const getRunStatus = new GetRunStatus(runRepository);
  const runController = new RunController(submitShard, getRunStatus, undefined, prepareSecretShards);

  const httpServer = new HttpServer(runController, env.port);
  await httpServer.start();

  const shutdown = async () => {
    logger.info("Shutting down gracefully");
    runRequestSubscriber.stop();
    await shardSubmissionQueue.shutdown();
    await httpServer.stop();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "Failed to bootstrap committee backend");
  process.exit(1);
});
