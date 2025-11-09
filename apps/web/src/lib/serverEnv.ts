import { z } from "zod";

const serverEnvSchema = z.object({
  PINATA_JWT: z.string().optional(),
  COMMITTEE_API_URL: z.string().url().default("http://localhost:4000"),
});

export const serverEnv = serverEnvSchema.parse({
  PINATA_JWT: process.env.PINATA_JWT,
  COMMITTEE_API_URL: process.env.COMMITTEE_API_URL,
});

export function requirePinataJwt(): string {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required when uploading to Pinata.");
  }
  return serverEnv.PINATA_JWT;
}
