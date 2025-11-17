import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  webSocket,
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

  const httpTransport = http(config.rpcUrl);
  const publicClient = createPublicClient({
    chain,
    transport: httpTransport,
  });
  const wsPublicClient = config.rpcWsUrl
    ? createPublicClient({
        chain,
        transport: webSocket(config.rpcWsUrl),
      })
    : undefined;

  const walletClient = createWalletClient({
    chain,
    transport: httpTransport,
    account,
  });

  return {
    chain,
    account,
    publicClient,
    walletClient,
    wsPublicClient,
  };
}
