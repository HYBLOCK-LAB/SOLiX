import { Run } from "../../domain/entities/run";
import type { RunRepository } from "../../domain/repositories/run-repository";
import type {
  SecretShare,
  SecretSharingService,
} from "../../domain/services/secret-sharing-service";

export type SecretEncoding = "hex" | "base64";

export interface CommitteeMemberInput {
  address: `0x${string}`;
  expiresAt?: Date;
  expiresInSeconds?: number;
  note?: string;
}

export interface PrepareSecretShardsInput {
  runId: string;
  secret: string;
  encoding: SecretEncoding;
  totalShares: number;
  threshold: number;
  defaultExpiresInSeconds?: number;
  members: CommitteeMemberInput[];
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
  private readonly defaultExpirySeconds = 60 * 60; // 1 hour

  constructor(
    private readonly runRepository: RunRepository,
    private readonly secretSharing: SecretSharingService
  ) {}

  async execute(input: PrepareSecretShardsInput): Promise<PrepareSecretShardsResult> {
    const run = await this.runRepository.find(input.runId);
    if (!run) {
      throw new Error(`Run ${input.runId} not found`);
    }

    if (input.members.length !== input.totalShares) {
      throw new Error("Member count must match totalShares");
    }

    if (run.threshold !== input.threshold) {
      throw new Error("Provided threshold does not match run configuration");
    }

    const secretBytes = this.decodeSecret(input.secret, input.encoding);
    if (secretBytes.length === 0) {
      throw new Error("Secret payload must not be empty");
    }

    const shares = this.secretSharing.split(secretBytes, {
      totalShares: input.totalShares,
      threshold: input.threshold,
    });

    const shards = shares.map((share, index) =>
      this.buildShardPayload(share, input.members[index], input.defaultExpiresInSeconds, run)
    );

    return {
      runId: run.runId,
      codeId: run.codeId.toString(),
      shardNonce: run.shardNonce.toString(),
      totalShares: shares.length,
      threshold: run.threshold,
      shards,
    };
  }

  private buildShardPayload(
    share: SecretShare,
    member: CommitteeMemberInput,
    defaultExpiresInSeconds: number | undefined,
    run: Run
  ): PreparedShard {
    if (!member) {
      throw new Error("Not enough member descriptors for generated shares");
    }

    const expiresAt = this.resolveExpiry(member, defaultExpiresInSeconds);
    return {
      committee: member.address,
      payload: {
        runId: run.runId,
        codeId: run.codeId.toString(),
        shardNonce: run.shardNonce.toString(),
        shareIndex: share.index,
        shareValue: share.value,
        byteLength: share.byteLength,
        expiresAt: expiresAt.toISOString(),
        note: member.note,
      },
    };
  }

  private resolveExpiry(member: CommitteeMemberInput, fallbackSeconds?: number): Date {
    if (member.expiresAt) {
      return member.expiresAt;
    }

    const seconds =
      member.expiresInSeconds ??
      fallbackSeconds ??
      this.defaultExpirySeconds;
    return new Date(Date.now() + seconds * 1000);
  }

  private decodeSecret(secret: string, encoding: SecretEncoding): Uint8Array {
    if (encoding === "hex") {
      const normalized = secret.startsWith("0x") ? secret.slice(2) : secret;
      if (normalized.length % 2 !== 0) {
        throw new Error("Hex secret must have even length");
      }
      return Uint8Array.from(Buffer.from(normalized, "hex"));
    }

    if (encoding === "base64") {
      return Uint8Array.from(Buffer.from(secret, "base64"));
    }

    throw new Error(`Unsupported encoding: ${encoding}`);
  }
}
