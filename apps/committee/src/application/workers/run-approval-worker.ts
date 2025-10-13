import type { ExecutionApprover } from "../../domain/services/execution-approver";
import type { EvidenceUploader } from "../../domain/services/evidence-uploader";
import type { RunRepository } from "../../domain/repositories/run-repository";
import { logger } from "../../shared/logger";

export class RunApprovalWorker {
  constructor(
    private readonly runRepository: RunRepository,
    private readonly executionApprover: ExecutionApprover,
    private readonly evidenceUploader?: EvidenceUploader
  ) {}

  async process(runId: string): Promise<void> {
    const run = await this.runRepository.find(runId);
    if (!run) {
      logger.warn({ runId }, "Run not found while processing approval");
      return;
    }

    if (run.status === "approved") {
      logger.debug({ runId }, "Run already approved");
      return;
    }

    const pieces = await this.runRepository.listPieces(runId);
    if (pieces.length < run.threshold) {
      logger.debug(
        { runId, pieceCount: pieces.length, threshold: run.threshold },
        "Run does not yet meet threshold"
      );
      return;
    }

    const encryptedPieceCids = pieces.map((piece) => piece.encryptedPieceCid);

    try {
      const bundleCid = this.evidenceUploader
        ? await this.evidenceUploader.upload(runId, encryptedPieceCids)
        : null;

      await this.executionApprover.approve(run.runId, run.codeId, encryptedPieceCids);
      run.approve(new Date());
      await this.runRepository.markApproved(run.runId, run.approvedAt!);
      logger.info({ runId, bundleCid }, "Run approved");
    } catch (error) {
      logger.error({ runId, err: error }, "Failed to approve execution");
      await this.runRepository.markFailed(runId, (error as Error).message);
      throw error;
    }
  }
}
