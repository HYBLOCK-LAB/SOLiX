export interface ExecutionApprover {
  approve(runId: string, codeId: bigint, encryptedPieceCids: string[]): Promise<void>;
}
