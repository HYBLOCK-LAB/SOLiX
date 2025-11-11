import { z } from "zod";

export const plainShardSchema = z.object({
  codeId: z.string().min(1),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  shards: z
    .array(
      z.object({
        committee: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        runNonce: z.string().min(1),
        shareIndex: z.number().int().min(1),
        shareValue: z.string().regex(/^0x[a-fA-F0-9]+$/),
        byteLength: z.number().int().positive(),
        expiresAt: z.string().optional(),
        note: z.string().max(256).optional(),
      })
    )
    .min(1),
});

export type PlainShardRequest = z.infer<typeof plainShardSchema>;
