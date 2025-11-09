import { z } from "zod";

export const prepareShardSchema = z.object({
  secret: z.string().min(1, "secret is required"),
  encoding: z.enum(["hex", "base64"]).default("base64"),
  totalShares: z.number().int().min(1),
  threshold: z.number().int().min(1),
  defaultExpiresInSeconds: z.number().int().positive().optional(),
  members: z
    .array(
      z.object({
        address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "address must be a valid hex address"),
        expiresAt: z
          .string()
          .datetime({ offset: true })
          .optional(),
        expiresInSeconds: z.number().int().positive().optional(),
        note: z.string().max(256).optional(),
      })
    )
    .min(1),
});

export type PrepareShardRequest = z.infer<typeof prepareShardSchema>;
