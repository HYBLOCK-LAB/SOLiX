import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  PORT: z.coerce.number().optional().default(4000),
  RPC_URL: z.string().min(1, "RPC_URL is required"),
  CHAIN_ID: z
    .string()
    .transform((value) => BigInt(value))
    .refine((value) => value > 0n, "CHAIN_ID must be positive"),
  CONTRACT_ADDRESS: z.string().length(42, "CONTRACT_ADDRESS must be a hex string"),
  OPERATOR_PK: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "OPERATOR_PK must be a 32-byte hex private key"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  RUN_TTL_SECONDS: z.coerce.number().optional().default(60 * 60 * 24),
  WEB3_STORAGE_TOKEN: z.string().optional(),
});

const rawEnv = envSchema.safeParse(process.env);

if (!rawEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${JSON.stringify(rawEnv.error.flatten().fieldErrors, null, 2)}`
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
  rpcUrl: parsed.RPC_URL,
  chainId: parsed.CHAIN_ID,
  contractAddress: parsed.CONTRACT_ADDRESS as `0x${string}`,
  operatorPrivateKey: parsed.OPERATOR_PK as `0x${string}`,
  redisUrl: parsed.REDIS_URL,
  runTtlSeconds: parsed.RUN_TTL_SECONDS,
  web3StorageToken: parsed.WEB3_STORAGE_TOKEN,
};
