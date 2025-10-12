import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { clientEnv } from "../env";

const chain = defineChain({
  id: Number(clientEnv.NEXT_PUBLIC_CHAIN_ID),
  name: clientEnv.NEXT_PUBLIC_CHAIN_NAME,
  network: clientEnv.NEXT_PUBLIC_CHAIN_NAME.toLowerCase().replace(/\s+/g, "-"),
  nativeCurrency: {
    name: clientEnv.NEXT_PUBLIC_CHAIN_SYMBOL,
    symbol: clientEnv.NEXT_PUBLIC_CHAIN_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [clientEnv.NEXT_PUBLIC_CHAIN_RPC_URL],
    },
    public: {
      http: [clientEnv.NEXT_PUBLIC_CHAIN_RPC_URL],
    },
  },
  blockExplorers: clientEnv.NEXT_PUBLIC_CHAIN_EXPLORER_URL
    ? {
        default: {
          name: `${clientEnv.NEXT_PUBLIC_CHAIN_NAME} Explorer`,
          url: clientEnv.NEXT_PUBLIC_CHAIN_EXPLORER_URL,
        },
      }
    : undefined,
});

export const wagmiConfig = getDefaultConfig({
  appName: "SOLiX License Portal",
  projectId: clientEnv.NEXT_PUBLIC_WALLETCONNECT_ID,
  chains: [chain],
  transports: {
    [chain.id]: http(clientEnv.NEXT_PUBLIC_CHAIN_RPC_URL),
  },
  ssr: true,
});

export const supportedChains = [chain];
