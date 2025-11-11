import { z } from "zod";

const serverEnvSchema = z.object({
  PINATA_JWT: z.string().optional(),
  COMMITTEE_API_URLS: z
    .string()
    .default("http://localhost:4000")
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
    .refine((urls) => urls.every((url) => /^https?:\/\//.test(url)), {
      message: "COMMITTEE_API_URLS must be comma separated HTTP(S) urls",
    }),
});

export const serverEnv = serverEnvSchema.parse({
  PINATA_JWT: process.env.PINATA_JWT,
  COMMITTEE_API_URLS: process.env.COMMITTEE_API_URLS,
});

export function requirePinataJwt(): string {
  if (!serverEnv.PINATA_JWT) {
    throw new Error("PINATA_JWT is required when uploading to Pinata.");
  }
  return serverEnv.PINATA_JWT;
}
