import { z } from "zod";

const serverEnvSchema = z.object({
  PINATA_JWT: z.string().optional(),
});

export const serverEnv = serverEnvSchema.parse({
  PINATA_JWT: process.env.PINATA_JWT,
});

export function requirePinataJwt(): string {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required when uploading to Pinata.");
  }
  return serverEnv.PINATA_JWT;
}
