import { z } from "zod";

const shardPayloadSchema = z.object({
  committee: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "committee must be a valid address"),
  shareIndex: z.number().int().min(1),
  shareValue: z.string().regex(/^0x[a-fA-F0-9]+$/, "shareValue must be hex"),
  byteLength: z.number().int().positive(),
  expiresAt: z
    .string()
    .datetime({ offset: true })
    .optional(),
  note: z.string().max(256).optional(),
});

export const prepareShardSchema = z.object({
  totalShares: z.number().int().min(1),
  threshold: z.number().int().min(1),
  shards: z.array(shardPayloadSchema).min(1),
});

export type PrepareShardRequest = z.infer<typeof prepareShardSchema>;
