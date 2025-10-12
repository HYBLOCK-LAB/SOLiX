import type { ShardSubmissionDTO } from "../dto/shard-submission.dto";
import { Run } from "../../domain/entities/run";
import type { RunRepository } from "../../domain/repositories/run-repository";

export interface SubmitShardResult {
  run: Run;
  isDuplicate: boolean;
  pieceCount: number;
  thresholdReached: boolean;
}

export class SubmitShard {
  constructor(private readonly runRepository: RunRepository) {}

  async execute(submission: ShardSubmissionDTO): Promise<SubmitShardResult> {
    const run = await this.runRepository.find(submission.runId);

    if (!run) {
      throw new Error(`Run ${submission.runId} not found`);
    }

    const isDuplicate = !(await this.runRepository.addPiece(run.runId, {
      submitter: submission.submitter,
      encryptedPieceCid: submission.encryptedPieceCid,
      signature: submission.signature,
      submittedAt: new Date(),
    }));

    const pieceCount = await this.runRepository.countPieces(run.runId);
    const thresholdReached = !isDuplicate && pieceCount >= run.threshold;

    return { run, isDuplicate, pieceCount, thresholdReached };
  }
}
