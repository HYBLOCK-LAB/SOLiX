import { z } from "zod";

const serverEnvSchema = z.object({
  STORACHA_AGENT_EXPORT: z.string().optional(),
});

export const serverEnv = serverEnvSchema.parse({
  STORACHA_AGENT_EXPORT: process.env.STORACHA_AGENT_EXPORT,
});

export function requireStorachaAgentExport(): string {
  if (!serverEnv.STORACHA_AGENT_EXPORT) {
    throw new Error("STORACHA_AGENT_EXPORT is required when using Storacha uploads.");
  }
  return serverEnv.STORACHA_AGENT_EXPORT;
}
