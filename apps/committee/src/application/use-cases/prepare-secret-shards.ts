import { Run } from "../../domain/entities/run";
import type { RunRepository } from "../../domain/repositories/run-repository";
import type { ShardRepository } from "../../domain/repositories/shard-repository";
export interface PrepareSecretShardsInput {
  runId: string;
  totalShares: number;
  threshold: number;
  shards: Array<{
    committee: `0x${string}`;
    shareIndex: number;
    shareValue: `0x${string}`;
    byteLength: number;
    expiresAt?: string;
    note?: string;
  }>;
}

export interface PreparedShard {
  committee: `0x${string}`;
  payload: {
    runId: string;
    codeId: string;
    shardNonce: string;
    shareIndex: number;
    shareValue: `0x${string}`;
    byteLength: number;
    expiresAt: string;
    note?: string;
  };
}

export interface PrepareSecretShardsResult {
  runId: string;
  codeId: string;
  shardNonce: string;
  totalShares: number;
  threshold: number;
  shards: PreparedShard[];
}

export class PrepareSecretShards {
  constructor(
    private readonly runRepository: RunRepository,
    private readonly shardRepository: ShardRepository
  ) {}

  async execute(
    input: PrepareSecretShardsInput
  ): Promise<PrepareSecretShardsResult> {
    const run = await this.runRepository.find(input.runId);
    if (!run) {
      throw new Error(`Run ${input.runId} not found`);
    }

    if (run.threshold !== input.threshold) {
      throw new Error("Provided threshold does not match run configuration");
    }

    if (input.shards.length !== input.totalShares) {
      throw new Error("Shard count must match totalShares");
    }

    const shards = input.shards.map((share) =>
      this.buildShardPayload(share, run)
    );

    const shardNonceHex = `0x${run.shardNonce.toString(16)}` as `0x${string}`;
    const result = {
      runId: run.runId,
      codeId: run.codeId.toString(),
      shardNonce: shardNonceHex,
      totalShares: shards.length,
      threshold: run.threshold,
      shards,
    };

    await this.shardRepository.saveMany(result.shards);
    return result;
  }

  async storePlainShards(
    codeId: string,
    wallet: `0x${string}`,
    shards: Array<{
      committee: `0x${string}`;
      shardNonce: string;
      shareIndex: number;
      shareValue: `0x${string}`;
      byteLength: number;
      expiresAt?: string;
      note?: string;
    }>
  ): Promise<void> {
    await this.shardRepository.savePlainShards(
      codeId,
      wallet,
      shards.map((shard) => ({
        runId: wallet,
        codeId,
        shardNonce: shard.shardNonce,
        committee: shard.committee,
        shareIndex: shard.shareIndex,
        shareValue: shard.shareValue,
        byteLength: shard.byteLength,
        expiresAt: shard.expiresAt ?? new Date().toISOString(),
        note: shard.note,
      }))
    );
  }

  private buildShardPayload(
    share: PrepareSecretShardsInput["shards"][number],
    run: Run
  ): PreparedShard {
    return {
      committee: share.committee,
      payload: {
        runId: run.runId,
        codeId: run.codeId.toString(),
        shardNonce: run.shardNonce.toString(),
        shareIndex: share.shareIndex,
        shareValue: share.shareValue,
        byteLength: share.byteLength,
        expiresAt: share.expiresAt ?? new Date().toISOString(),
        note: share.note,
      },
    };
  }
}
