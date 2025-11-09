export interface StoredShard {
  runId: string;
  codeId: string;
  shardNonce: string;
  committee: `0x${string}`;
  shareIndex: number;
  shareValue: `0x${string}`;
  byteLength: number;
  expiresAt: string;
  note?: string;
  submittedAt?: string;
  shardCid?: string;
}
