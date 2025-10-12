import { z } from "zod";

export const shardSubmissionSchema = z.object({
  runId: z.string().min(1),
  submitter: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "submitter must be a valid address"),
  encryptedPieceCid: z.string().min(1),
  sig: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/, "sig must be a hex string"),
});

export type ShardSubmissionInput = z.infer<typeof shardSubmissionSchema>;
