import type { HandleRunRequested } from "../use-cases/handle-run-requested";
import type { Run } from "../../domain/entities/run";
import type { ShardRepository } from "../../domain/repositories/shard-repository";
import type { ShardSubmissionQueue } from "../../infrastructure/queue/shard-submission-queue";
import { logger } from "../../shared/logger";
import { CommitteeThresholdProvider } from "./committee-threshold-provider";

export interface RunRequestPayload {
  codeId: bigint;
  requester: `0x${string}`;
  runNonce: `0x${string}`;
  recipientPubKey: `0x${string}`;
  requestedAt: Date;
}

export interface RunRequestResult {
  queued: boolean;
  run?: Run;
  reason?: string;
}

export class RunRequestProcessor {
  constructor(
    private readonly handler: HandleRunRequested,
    private readonly shardRepository: ShardRepository,
    private readonly shardSubmissionQueue: ShardSubmissionQueue,
    private readonly committeeAddress: `0x${string}`,
    private readonly thresholdProvider: CommitteeThresholdProvider
  ) {}

  async process(payload: RunRequestPayload): Promise<RunRequestResult> {
    const threshold = await this.thresholdProvider.getThreshold();
    const run = await this.handler.execute({
      runId: this.buildRunKey(
        payload.codeId,
        payload.requester,
        payload.runNonce
      ),
      codeId: payload.codeId,
      runNonce: BigInt(payload.runNonce),
      threshold,
      requester: payload.requester,
      requestedAt: payload.requestedAt,
    });

    const shard = await this.shardRepository.findForCommittee(
      run.codeId.toString(),
      this.committeeAddress
    );

    if (!shard) {
      logger.debug(
        { codeId: run.codeId.toString(), requester: run.requester },
        "No shard assigned to this committee for run"
      );
      return { queued: false, reason: "NO_SHARD" };
    }

    await this.shardSubmissionQueue.enqueue({
      codeId: shard.codeId,
      recipientPubKey: payload.recipientPubKey,
      requester: run.requester,
      runNonce: payload.runNonce,
    });

    return { queued: true, run };
  }

  private buildRunKey(
    codeId: bigint,
    requester: `0x${string}`,
    runNonce: `0x${string}`
  ): string {
    return `${codeId.toString()}:${requester.toLowerCase()}:${runNonce.toLowerCase()}`;
  }
}
