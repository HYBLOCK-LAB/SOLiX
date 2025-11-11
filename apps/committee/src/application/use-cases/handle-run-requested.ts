import { Run } from "../../domain/entities/run";
import type { RunRepository } from "../../domain/repositories/run-repository";

export interface RunRequestedPayload {
  runId: string;
  codeId: bigint;
  runNonce: bigint;
  threshold: number;
  requester: `0x${string}`;
  requestedAt: Date;
}

export class HandleRunRequested {
  constructor(private readonly runRepository: RunRepository) {}

  async execute(payload: RunRequestedPayload): Promise<Run> {
    const run = new Run(
      payload.runId,
      payload.codeId,
      payload.runNonce,
      payload.threshold,
      payload.requester,
      payload.requestedAt
    );

    const created = await this.runRepository.create(run);

    if (!created) {
      const existing = await this.runRepository.find(payload.runId);
      return existing ?? run;
    }

    return run;
  }
}
