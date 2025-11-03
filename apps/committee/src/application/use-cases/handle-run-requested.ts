import { Run } from "../../domain/entities/run";
import type { RunRepository } from "../../domain/repositories/run-repository";
import type { ThresholdService } from "../../domain/services/threshold-service";

export interface RunRequestedPayload {
  runId: string;
  codeId: bigint;
  requestedAt: Date;
}

export class HandleRunRequested {
  constructor(
    private readonly runRepository: RunRepository,
    private readonly thresholdService: ThresholdService
  ) {}

  async execute(payload: RunRequestedPayload): Promise<Run> {
    const threshold = await this.thresholdService.getThreshold(payload.codeId);
    const run = new Run(payload.runId, payload.codeId, threshold, payload.requestedAt);

    const created = await this.runRepository.create(run);

    if (!created) {
      const existing = await this.runRepository.find(payload.runId);
      return existing ?? run;
    }

    return run;
  }
}
