import type { EncryptedShardPayload } from "./shard-encryptor";

export interface ShardPublication {
  runId: string;
  codeId: string;
  shardNonce: string;
  committee: `0x${string}`;
  shareIndex: number;
  payload: EncryptedShardPayload;
  note?: string;
  createdAt: string;
}

export interface ShardPublisher {
  publishShard(publication: ShardPublication): Promise<string>;
}
