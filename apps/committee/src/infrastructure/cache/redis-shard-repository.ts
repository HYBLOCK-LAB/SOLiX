import type { Redis } from "ioredis";
import type { PreparedShard } from "../../application/use-cases/prepare-secret-shards";
import type { ShardRepository } from "../../domain/repositories/shard-repository";
import type { StoredShard } from "../../domain/entities/shard";

export class RedisShardRepository implements ShardRepository {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number
  ) {}

  async saveMany(shards: PreparedShard[]): Promise<void> {
    if (shards.length === 0) {
      return;
    }

    const pipeline = this.redis.pipeline();
    for (const shard of shards) {
      const record: StoredShard = {
        codeId: shard.payload.codeId,
        requester: shard.payload.requester,
        runNonce: shard.payload.runNonce,
        committee: shard.committee,
        shareIndex: shard.payload.shareIndex,
        shareValue: shard.payload.shareValue,
        byteLength: shard.payload.byteLength,
        expiresAt: shard.payload.expiresAt,
        note: shard.payload.note,
      };

      pipeline.set(
        this.key(record.codeId, record.requester, record.runNonce, record.committee),
        JSON.stringify(record),
        "EX",
        this.ttlSeconds
      );
    }
    await pipeline.exec();
  }

  async findForCommittee(
    codeId: string,
    requester: `0x${string}`,
    runNonce: string,
    committee: `0x${string}`
  ): Promise<StoredShard | null> {
    const payload = await this.redis.get(this.key(codeId, requester, runNonce, committee));
    if (!payload) {
      return null;
    }
    return JSON.parse(payload) as StoredShard;
  }

  async saveRawShard(payload: StoredShard): Promise<void> {
    await this.redis.set(
      this.key(payload.codeId, payload.requester, payload.runNonce, payload.committee),
      JSON.stringify(payload),
      "EX",
      this.ttlSeconds
    );
  }

  async savePlainShards(
    codeId: string,
    requester: `0x${string}`,
    shards: StoredShard[]
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const shard of shards) {
      pipeline.set(
        this.key(codeId, requester, shard.runNonce, shard.committee),
        JSON.stringify(shard),
        "EX",
        this.ttlSeconds
      );
    }
    await pipeline.exec();
  }

  async markSubmitted(
    codeId: string,
    requester: `0x${string}`,
    runNonce: string,
    committee: `0x${string}`,
    shardCid: string,
    submittedAt: Date
  ): Promise<void> {
    const key = this.key(codeId, requester, runNonce, committee);
    const payload = await this.redis.get(key);
    if (!payload) {
      return;
    }
    const parsed = JSON.parse(payload) as StoredShard;
    parsed.shardCid = shardCid;
    parsed.submittedAt = submittedAt.toISOString();
    await this.redis.set(key, JSON.stringify(parsed), "EX", this.ttlSeconds);
  }

  private key(codeId: string, requester: `0x${string}`, runNonce: string, committee: `0x${string}`) {
    return `shard:${committee.toLowerCase()}:${codeId}:${requester.toLowerCase()}:${runNonce.toLowerCase()}`;
  }
}
