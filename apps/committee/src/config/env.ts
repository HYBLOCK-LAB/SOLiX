import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().optional().default(4000),
  PUBLIC_CHAIN_RPC_URL: z
    .string()
    .min(1, "PUBLIC_CHAIN_RPC_URL is required"),
  PUBLIC_CHAIN_ID: z
    .string()
    .transform((value) => BigInt(value))
    .refine((value) => value > 0n, "PUBLIC_CHAIN_ID must be positive"),
  PUBLIC_CONTRACT_ADDRESS: z
    .string()
    .length(42, "PUBLIC_CONTRACT_ADDRESS must be a hex string"),
  WALLET_PRIVATE_KEY: z
    .string()
    .regex(
      /^0x?[a-fA-F0-9]{64}$/,
      "WALLET_PRIVATE_KEY must be a 32-byte hex private key"
    )
    .transform((value) => (value.startsWith("0x") ? value : `0x${value}`)),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  RUN_TTL_SECONDS: z.coerce
    .number()
    .optional()
    .default(60 * 60 * 24),
  PINATA_JWT: z.string().optional(),
});

const rawEnv = envSchema.safeParse(process.env);

if (!rawEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${JSON.stringify(
      rawEnv.error.flatten().fieldErrors,
      null,
      2
    )}`
  );
}

export type AppConfig = {
  port: number;
  rpcUrl: string;
  chainId: bigint;
  contractAddress: `0x${string}`;
  operatorPrivateKey: `0x${string}`;
  redisUrl: string;
  runTtlSeconds: number;
  web3StorageToken?: string;
};

const parsed = rawEnv.data;

export const env: AppConfig = {
  port: parsed.PORT,
  rpcUrl: parsed.PUBLIC_CHAIN_RPC_URL,
  chainId: parsed.PUBLIC_CHAIN_ID,
  contractAddress: parsed.PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
  operatorPrivateKey: parsed.WALLET_PRIVATE_KEY as `0x${string}`,
  redisUrl: parsed.REDIS_URL,
  runTtlSeconds: parsed.RUN_TTL_SECONDS,
  web3StorageToken: parsed.PINATA_JWT,
};
