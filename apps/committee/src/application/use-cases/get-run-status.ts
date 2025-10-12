import type { Run } from "../../domain/entities/run";
import type { RunRepository } from "../../domain/repositories/run-repository";

export interface RunStatusView {
  run: Run | null;
  pieceCount: number;
}

export class GetRunStatus {
  constructor(private readonly runRepository: RunRepository) {}

  async execute(runId: string): Promise<RunStatusView> {
    const run = await this.runRepository.find(runId);
    const pieceCount = run ? await this.runRepository.countPieces(runId) : 0;

    return { run, pieceCount };
  }
}
