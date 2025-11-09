export interface EncryptedShardPayload {
  algorithm: string;
  ciphertext: `0x${string}`;
  iv: `0x${string}`;
  authTag: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
}

export interface RemoteShardPublication {
  runId: string;
  codeId: string;
  shardNonce: string;
  committee: `0x${string}`;
  shareIndex: number;
  byteLength: number;
  payload: EncryptedShardPayload;
  note?: string;
  createdAt: string;
}

export interface SecretSharePayload {
  index: number;
  value: `0x${string}`;
  byteLength: number;
}
