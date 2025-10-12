import type { Redis } from "ioredis";
import { Run, type RunPiece } from "../../domain/entities/run";
import type { RunRepository } from "../../domain/repositories/run-repository";

interface PersistedRun {
  runId: string;
  codeId: string;
  threshold: number;
  status: Run["status"];
  createdAt: string;
  approvedAt?: string;
  failureReason?: string;
}

interface PersistedPiece {
  encryptedPieceCid: string;
  submittedAt: string;
  submitter: `0x${string}`;
  signature: `0x${string}`;
}

export class RedisRunRepository implements RunRepository {
  private readonly approvedTtlSeconds = 60 * 60; // 1 hour

  constructor(
    private readonly redis: Redis,
    private readonly runTtlSeconds: number
  ) {}

  async create(run: Run): Promise<boolean> {
    const key = this.metaKey(run.runId);
    const payload: PersistedRun = {
      runId: run.runId,
      codeId: run.codeId.toString(),
      threshold: run.threshold,
      status: run.status,
      createdAt: run.createdAt.toISOString(),
    };

    const created = await this.redis.set(key, JSON.stringify(payload), "NX", "EX", this.runTtlSeconds);

    if (created === "OK") {
      await this.redis.del(this.failureKey(run.runId));
      await this.redis.del(this.piecesKey(run.runId));
      await this.redis.expire(this.piecesKey(run.runId), this.runTtlSeconds);
      return true;
    }

    return false;
  }

  async find(runId: string): Promise<Run | null> {
    const payload = await this.redis.get(this.metaKey(runId));
    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(payload) as PersistedRun;
    const run = new Run(
      parsed.runId,
      BigInt(parsed.codeId),
      parsed.threshold,
      new Date(parsed.createdAt),
      parsed.status,
      parsed.approvedAt ? new Date(parsed.approvedAt) : undefined
    );
    return run;
  }

  async addPiece(runId: string, piece: RunPiece): Promise<boolean> {
    const key = this.piecesKey(runId);
    const stored: PersistedPiece = {
      encryptedPieceCid: piece.encryptedPieceCid,
      submittedAt: piece.submittedAt.toISOString(),
      submitter: piece.submitter,
      signature: piece.signature,
    };
    const added = await this.redis.hsetnx(key, piece.submitter.toLowerCase(), JSON.stringify(stored));
    if (added) {
      await this.redis.expire(key, this.runTtlSeconds);
    }
    return added === 1;
  }

  async listPieces(runId: string): Promise<RunPiece[]> {
    const key = this.piecesKey(runId);
    const entries = await this.redis.hgetall(key);
    return Object.values(entries).map((value) => {
      const parsed = JSON.parse(value) as PersistedPiece;
      return {
        submitter: parsed.submitter,
        encryptedPieceCid: parsed.encryptedPieceCid,
        signature: parsed.signature,
        submittedAt: new Date(parsed.submittedAt),
      };
    });
  }

  async countPieces(runId: string): Promise<number> {
    return this.redis.hlen(this.piecesKey(runId));
  }

  async markApproved(runId: string, approvedAt: Date): Promise<void> {
    const key = this.metaKey(runId);
    const payload = await this.redis.get(key);
    if (!payload) {
      return;
    }

    const parsed = JSON.parse(payload) as PersistedRun;
    parsed.status = "approved";
    parsed.approvedAt = approvedAt.toISOString();
    await this.redis.set(key, JSON.stringify(parsed), "XX", "EX", this.approvedTtlSeconds);
    await this.redis.expire(this.piecesKey(runId), this.approvedTtlSeconds);
  }

  async markFailed(runId: string, reason: string): Promise<void> {
    await this.redis.set(this.failureKey(runId), reason, "EX", this.runTtlSeconds);
  }

  private metaKey(runId: string) {
    return `run:${runId}:meta`;
  }

  private piecesKey(runId: string) {
    return `run:${runId}:pieces`;
  }

  private failureKey(runId: string) {
    return `run:${runId}:failure`;
  }
}
