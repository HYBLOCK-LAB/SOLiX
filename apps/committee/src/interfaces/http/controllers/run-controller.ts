import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { SubmitShard } from "../../../application/use-cases/submit-shard";
import type { GetRunStatus } from "../../../application/use-cases/get-run-status";
import type { RunApprovalQueue } from "../../../infrastructure/queue/run-approval-queue";
import type { PrepareSecretShards } from "../../../application/use-cases/prepare-secret-shards";
import { shardSubmissionSchema } from "../validators/shard-schema";
import {
  prepareShardSchema,
  type PrepareShardRequest,
} from "../validators/prepare-shards-schema";
import {
  plainShardSchema,
  type PlainShardRequest,
} from "../validators/plain-shards-schema";

interface ShardRequestBody {
  runId: string;
  submitter: `0x${string}`;
  encryptedPieceCid: string;
  sig: `0x${string}`;
}

export class RunController {
  constructor(
    private readonly submitShard: SubmitShard,
    private readonly getRunStatus: GetRunStatus,
    private readonly approvalQueue?: RunApprovalQueue,
    private readonly prepareSecretShards?: PrepareSecretShards
  ) {}

  registerRoutes(server: FastifyInstance) {
    server.post(
      "/codes/:codeId/shards/plain",
      async (
        request: FastifyRequest<{
          Params: { codeId: string };
          Body: PlainShardRequest;
        }>,
        reply: FastifyReply
      ) => {
        if (!this.prepareSecretShards) {
          return reply
            .status(501)
            .send({ message: "Shard storage is disabled" });
        }

        const parsed = plainShardSchema.parse(request.body);

        try {
          await this.prepareSecretShards.storePlainShards(
            request.params.codeId,
            parsed.wallet as `0x${string}`,
            parsed.shards.map((shard) => ({
              committee: shard.committee as `0x${string}`,
              shardNonce: shard.shardNonce,
              shareIndex: shard.shareIndex,
              shareValue: shard.shareValue as `0x${string}`,
              byteLength: shard.byteLength,
              expiresAt: shard.expiresAt,
              note: shard.note,
            }))
          );
          return reply.status(201).send({ status: "stored" });
        } catch (error) {
          return reply.status(400).send({ message: (error as Error).message });
        }
      }
    );

    server.post(
      "/shards",
      async (
        request: FastifyRequest<{ Body: ShardRequestBody }>,
        reply: FastifyReply
      ) => {
        const parsed = shardSubmissionSchema.parse(request.body);

        try {
          const result = await this.submitShard.execute({
            runId: parsed.runId,
            submitter: parsed.submitter as `0x${string}`,
            encryptedPieceCid: parsed.encryptedPieceCid,
            signature: parsed.sig as `0x${string}`,
          });

          if (result.thresholdReached && this.approvalQueue) {
            await this.approvalQueue.enqueue(result.run.runId);
          }

          return reply.status(result.isDuplicate ? 200 : 201).send({
            runId: result.run.runId,
            codeId: result.run.codeId.toString(),
            shardNonce: result.run.shardNonce.toString(),
            requester: result.run.requester,
            isDuplicate: result.isDuplicate,
            pieceCount: result.pieceCount,
            threshold: result.run.threshold,
            thresholdReached: result.thresholdReached,
            status: result.run.status,
          });
        } catch (error) {
          if ((error as Error).message.includes("not found")) {
            return reply
              .status(404)
              .send({ message: (error as Error).message });
          }

          throw error;
        }
      }
    );

    server.get("/health", async () => ({ status: "ok" }));
  }
}
