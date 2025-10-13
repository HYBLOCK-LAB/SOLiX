export type RunStatus = "pending" | "approved";

export interface RunPiece {
  submitter: `0x${string}`;
  encryptedPieceCid: string;
  signature: `0x${string}`;
  submittedAt: Date;
}

export class Run {
  constructor(
    public readonly runId: string,
    public readonly codeId: bigint,
    public readonly threshold: number,
    public readonly createdAt: Date,
    public status: RunStatus = "pending",
    public approvedAt?: Date
  ) {}

  approve(timestamp: Date) {
    if (this.status === "approved") {
      return;
    }

    this.status = "approved";
    this.approvedAt = timestamp;
  }
}
