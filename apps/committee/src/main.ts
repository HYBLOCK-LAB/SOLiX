import IORedis from "ioredis";
import { env } from "./config/env";
import { logger } from "./shared/logger";
import { createViemClients } from "./infrastructure/blockchain/viem-clients";
import { RedisRunRepository } from "./infrastructure/cache/redis-run-repository";
import { HandleRunRequested } from "./application/use-cases/handle-run-requested";
import { RunRequestSubscriber } from "./infrastructure/blockchain/run-request-subscriber";
import { SubmitShard } from "./application/use-cases/submit-shard";
import { GetRunStatus } from "./application/use-cases/get-run-status";
import { RunApprovalQueue } from "./infrastructure/queue/run-approval-queue";
import { RunApprovalWorker } from "./application/workers/run-approval-worker";
import { BlockchainExecutionApprover } from "./infrastructure/blockchain/blockchain-execution-approver";
import { NoopEvidenceUploader } from "./infrastructure/evidence/noop-evidence-uploader";
import { Web3StorageEvidenceUploader } from "./infrastructure/evidence/web3-storage-evidence-uploader";
import { HttpServer } from "./interfaces/http/http-server";
import { RunController } from "./interfaces/http/controllers/run-controller";
import { ShamirSecretSharingService } from "./infrastructure/crypto/shamir-secret-sharing-service";
import { PrepareSecretShards } from "./application/use-cases/prepare-secret-shards";

async function bootstrap() {
  logger.info("Bootstrapping committee backend");

  const redis = new IORedis(env.redisUrl);
  const runRepository = new RedisRunRepository(redis, env.runTtlSeconds);

  const { publicClient, walletClient, account } = createViemClients(env);
  const executionApprover = new BlockchainExecutionApprover(walletClient, publicClient, env.contractAddress, account);

  const evidenceUploader = env.web3StorageToken
    ? new Web3StorageEvidenceUploader(env.web3StorageToken)
    : new NoopEvidenceUploader();

  const runApprovalWorker = new RunApprovalWorker(runRepository, executionApprover, evidenceUploader);
  const approvalQueue = new RunApprovalQueue(env.redisUrl);
  approvalQueue.startWorker(async (runId) => runApprovalWorker.process(runId));

  const secretSharingService = new ShamirSecretSharingService();
  const prepareSecretShards = new PrepareSecretShards(runRepository, secretSharingService);

  const handleRunRequested = new HandleRunRequested(runRepository);
  const runRequestSubscriber = new RunRequestSubscriber(publicClient, env.contractAddress, handleRunRequested);
  runRequestSubscriber.start();

  const submitShard = new SubmitShard(runRepository);
  const getRunStatus = new GetRunStatus(runRepository);
  const runController = new RunController(submitShard, getRunStatus, approvalQueue, prepareSecretShards);

  const httpServer = new HttpServer(runController, env.port);
  await httpServer.start();

  const shutdown = async () => {
    logger.info("Shutting down gracefully");
    runRequestSubscriber.stop();
    await approvalQueue.shutdown();
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
