import type { PreparedShard } from "../../application/use-cases/prepare-secret-shards";
import type { StoredShard } from "../entities/shard";

export interface ShardRepository {
  saveMany(shards: PreparedShard[]): Promise<void>;
  findByRunAndCommittee(runId: string, committee: `0x${string}`): Promise<StoredShard | null>;
  markSubmitted(
    runId: string,
    committee: `0x${string}`,
    shardCid: string,
    submittedAt: Date
  ): Promise<void>;
}
