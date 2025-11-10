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
import { CommitteeThresholdProvider } from "./application/services/committee-threshold-provider";
import { RunRequestProcessor } from "./application/services/run-request-processor";

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

  const committeeAddressOverrides: Record<string, `0x${string}`> = {
    "committee-1": "0x1111111111111111111111111111111111111111",
    "committee-2": "0x2222222222222222222222222222222222222222",
    "committee-3": "0x3333333333333333333333333333333333333333",
    "committee-4": "0x4444444444444444444444444444444444444444",
    "committee-5": "0x5555555555555555555555555555555555555555",
  };
  const committeeAddress =
    committeeAddressOverrides[committeeId] ?? account.address;

  const shardEncryptor = new EcdhShardEncryptor();
  const shardPublisher = new PinataShardPublisher(env.pinataJwt);
  const shardSubmitter = new BlockchainShardSubmitter(
    walletClient,
    publicClient,
    env.committeeManagerAddress,
    account
  );
  const normalizedQueueSuffix = committeeId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const shardQueueName = `shard_submission_${normalizedQueueSuffix}`;
  const shardSubmissionQueue = new ShardSubmissionQueue(
    env.redisUrl,
    shardQueueName
  );
  const shardWorker = new ShardSubmissionWorker(
    shardRepository,
    shardEncryptor,
    shardPublisher,
    shardSubmitter,
    committeeAddress
  );
  shardSubmissionQueue.startWorker(async (job) => shardWorker.process(job));

  const prepareSecretShards = new PrepareSecretShards(
    runRepository,
    shardRepository
  );

  const handleRunRequested = new HandleRunRequested(runRepository);
  const thresholdProvider = new CommitteeThresholdProvider(
    publicClient,
    env.committeeManagerAddress
  );
  const runRequestProcessor = new RunRequestProcessor(
    handleRunRequested,
    shardRepository,
    shardSubmissionQueue,
    committeeAddress,
    thresholdProvider
  );
  const runRequestSubscriber = new RunRequestSubscriber(
    publicClient,
    env.licenseManagerAddress,
    runRequestProcessor,
    env.eventPollIntervalMs
  );
  runRequestSubscriber.start();

  const submitShard = new SubmitShard(runRepository);
  const getRunStatus = new GetRunStatus(runRepository);
  const runController = new RunController(
    submitShard,
    getRunStatus,
    undefined,
    prepareSecretShards,
    runRequestProcessor
  );

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
