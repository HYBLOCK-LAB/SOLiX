import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AppConfig } from "../../config/env";

export function createViemClients(config: AppConfig) {
  const chain = defineChain({
    id: Number(config.chainId),
    name: "solix",
    network: "solix",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
    },
  });

  const account = privateKeyToAccount(config.operatorPrivateKey);

  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });

  const walletClient = createWalletClient({
    chain,
    transport: http(config.rpcUrl),
    account,
  });

  return { chain, account, publicClient, walletClient };
}
