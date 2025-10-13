export type TAddress = `0x${string}`;

export interface ShardSubmissionDTO {
  runId: string;
  submitter: TAddress;
  encryptedPieceCid: string;
  signature: TAddress;
}
