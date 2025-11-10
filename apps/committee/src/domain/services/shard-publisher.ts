import type { EncryptedShardPayload } from "./shard-encryptor";

export interface ShardPublication {
  codeId: string;
  requester: `0x${string}`;
  runNonce: string;
  committee: `0x${string}`;
  shareIndex: number;
  byteLength: number;
  payload: EncryptedShardPayload;
  note?: string;
  createdAt: string;
}

export interface ShardPublisher {
  publishShard(publication: ShardPublication): Promise<string>;
}
