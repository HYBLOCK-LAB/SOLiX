import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.string().min(1).default("11155111"),
  NEXT_PUBLIC_CHAIN_NAME: z.string().default("SOLiX Devnet"),
  NEXT_PUBLIC_CHAIN_RPC_URL: z.string().url(),
  NEXT_PUBLIC_CHAIN_SYMBOL: z.string().default("ETH"),
  NEXT_PUBLIC_CHAIN_EXPLORER_URL: z.string().url().optional(),
  NEXT_PUBLIC_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"),
  NEXT_PUBLIC_WALLETCONNECT_ID: z.string().min(1),
  NEXT_PUBLIC_STORAGE_MODE: z.enum(["local", "production"]).default("local"),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME,
  NEXT_PUBLIC_CHAIN_RPC_URL: process.env.NEXT_PUBLIC_CHAIN_RPC_URL,
  NEXT_PUBLIC_CHAIN_SYMBOL: process.env.NEXT_PUBLIC_CHAIN_SYMBOL,
  NEXT_PUBLIC_CHAIN_EXPLORER_URL: process.env.NEXT_PUBLIC_CHAIN_EXPLORER_URL,
  NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  NEXT_PUBLIC_WALLETCONNECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_ID,
  NEXT_PUBLIC_STORAGE_MODE: process.env.NEXT_PUBLIC_STORAGE_MODE,
});
