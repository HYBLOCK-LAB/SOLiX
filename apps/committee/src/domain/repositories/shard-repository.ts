import type { PreparedShard } from "../../application/use-cases/prepare-secret-shards";
import type { StoredShard } from "../entities/shard";

export interface ShardRepository {
  saveMany(shards: PreparedShard[]): Promise<void>;
  findForCommittee(
    codeId: string,
    requester: `0x${string}`,
    committee: `0x${string}`
  ): Promise<StoredShard | null>;
  savePlainShards(
    codeId: string,
    requester: `0x${string}`,
    shards: StoredShard[]
  ): Promise<void>;
  saveRawShard(payload: StoredShard): Promise<void>;
  markSubmitted(
    codeId: string,
    requester: `0x${string}`,
    committee: `0x${string}`,
    shardCid: string,
    submittedAt: Date
  ): Promise<void>;
}
