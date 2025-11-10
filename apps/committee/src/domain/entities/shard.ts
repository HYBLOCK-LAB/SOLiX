export interface StoredShard {
  codeId: string;
  requester: `0x${string}`;
  runNonce: string;
  committee: `0x${string}`;
  shareIndex: number;
  shareValue: `0x${string}`;
  byteLength: number;
  expiresAt: string;
  note?: string;
  submittedAt?: string;
  shardCid?: string;
}
