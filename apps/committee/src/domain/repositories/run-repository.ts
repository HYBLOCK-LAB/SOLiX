import type { Run, RunPiece } from "../entities/run";

export interface RunRepository {
  create(run: Run): Promise<boolean>;
  find(runId: string): Promise<Run | null>;
  addPiece(runId: string, piece: RunPiece): Promise<boolean>;
  listPieces(runId: string): Promise<RunPiece[]>;
  countPieces(runId: string): Promise<number>;
  markApproved(runId: string, approvedAt: Date): Promise<void>;
  markFailed(runId: string, reason: string): Promise<void>;
}
