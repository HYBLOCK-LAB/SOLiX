import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { SubmitShard } from "../../../application/use-cases/submit-shard";
import type { GetRunStatus } from "../../../application/use-cases/get-run-status";
import type { RunApprovalQueue } from "../../../infrastructure/queue/run-approval-queue";
import { shardSubmissionSchema } from "../validators/shard-schema";

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
    private readonly approvalQueue?: RunApprovalQueue
  ) {}

  registerRoutes(server: FastifyInstance) {
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

    server.get(
      "/runs/:runId",
      async (
        request: FastifyRequest<{ Params: { runId: string } }>,
        reply: FastifyReply
      ) => {
        const runId = request.params.runId;
        const status = await this.getRunStatus.execute(runId);

        if (!status.run) {
          return reply.status(404).send({ message: "Run not found" });
        }

        return reply.send({
          runId: status.run.runId,
          codeId: status.run.codeId.toString(),
          status: status.run.status,
          pieceCount: status.pieceCount,
          threshold: status.run.threshold,
          approvedAt: status.run.approvedAt?.toISOString() ?? null,
        });
      }
    );

    server.get("/health", async () => ({ status: "ok" }));
  }
}
