import type { ShardRepository } from "../../domain/repositories/shard-repository";
import type { ShardEncryptor } from "../../domain/services/shard-encryptor";
import type { ShardPublisher } from "../../domain/services/shard-publisher";
import type { ShardSubmitter } from "../../domain/services/shard-submitter";
import type { ShardSubmissionJob } from "../../infrastructure/queue/shard-submission-queue";
import { logger } from "../../shared/logger";

export class ShardSubmissionWorker {
  constructor(
    private readonly shardRepository: ShardRepository,
    private readonly encryptor: ShardEncryptor,
    private readonly publisher: ShardPublisher,
    private readonly submitter: ShardSubmitter,
    private readonly committeeAddress: `0x${string}`
  ) {}

  async process(job: ShardSubmissionJob) {
    const shard = await this.shardRepository.findForCommittee(
      job.codeId,
      job.requester,
      job.runNonce,
      this.committeeAddress
    );
    if (!shard) {
      logger.warn(
        {
          codeId: job.codeId,
          requester: job.requester,
          runNonce: job.runNonce,
          committee: this.committeeAddress,
        },
        "No shard prepared for this run"
      );
      return;
    }

    if (shard.runNonce.toLowerCase() !== job.runNonce.toLowerCase()) {
      logger.warn(
        {
          codeId: job.codeId,
          requester: job.requester,
          expected: job.runNonce,
          actual: shard.runNonce,
          committee: this.committeeAddress,
        },
        "Stored shard nonce mismatch, skipping submission"
      );
      return;
    }

    if (shard.submittedAt) {
      logger.info(
        { codeId: job.codeId, requester: job.requester, runNonce: job.runNonce, committee: this.committeeAddress },
        "Shard already submitted, skipping"
      );
      return;
    }

    const now = new Date();
    const expiry = new Date(shard.expiresAt);
    if (expiry.getTime() <= now.getTime()) {
      logger.warn(
        { codeId: job.codeId, requester: job.requester, runNonce: job.runNonce, committee: this.committeeAddress },
        "Shard expired before submission"
      );
      return;
    }

    const encrypted = await this.encryptor.encrypt({
      recipientPublicKey: job.recipientPubKey,
      secretShare: shard.shareValue,
    });

    const cid = await this.publisher.publishShard({
      codeId: shard.codeId,
      requester: shard.requester,
      runNonce: shard.runNonce,
      committee: this.committeeAddress,
      shareIndex: shard.shareIndex,
      byteLength: shard.byteLength,
      payload: encrypted,
      note: shard.note,
      createdAt: now.toISOString(),
    });

    await this.submitter.submitShard({
      codeId: BigInt(shard.codeId),
      requester: job.requester,
      runNonce: job.runNonce,
      shardCid: cid,
    });

    await this.shardRepository.markSubmitted(
      shard.codeId,
      shard.requester,
      job.runNonce,
      this.committeeAddress,
      cid,
      now
    );
    logger.info(
      {
        codeId: shard.codeId,
        requester: shard.requester,
        runNonce: job.runNonce,
        committee: this.committeeAddress,
        cid,
      },
      "Shard submitted successfully"
    );
  }
}
