import { z } from "zod";

export const manualRunSchema = z.object({
  codeId: z.string().min(1),
  requester: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  runNonce: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  recipientPubKey: z.string().regex(/^0x[a-fA-F0-9]+$/),
  requestedAt: z.string().optional(),
});

export type ManualRunRequest = z.infer<typeof manualRunSchema>;
