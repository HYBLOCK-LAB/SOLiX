import { HttpRequestError, type Account, type PublicClient, type WalletClient } from "viem";
import type { ShardSubmitParams, ShardSubmitter } from "../../domain/services/shard-submitter";
import { committeeAbi } from "./committee-abi";
import { logger } from "../../shared/logger";

const RETRY_DELAY_MS = 5_000;
const MAX_RETRIES = 5;

export class BlockchainShardSubmitter implements ShardSubmitter {
  constructor(
    private readonly walletClient: WalletClient,
    private readonly publicClient: PublicClient,
    private readonly contractAddress: `0x${string}`,
    private readonly account: Account
  ) {}

  async submitShard(params: ShardSubmitParams): Promise<void> {
    logger.info(
      {
        codeId: params.codeId.toString(),
        requester: params.requester,
        runNonce: params.runNonce,
      shardCid: params.shardCid,
    },
    "[IPFS] Submitting shard on-chain"
  );

    let attempt = 0;
    while (true) {
      try {
        const hash = await this.walletClient.writeContract({
          address: this.contractAddress,
          abi: committeeAbi,
          functionName: "submitShard",
          args: [params.codeId, params.requester, params.runNonce, params.shardCid],
          account: this.account,
          chain: undefined,
        });

        await this.publicClient.waitForTransactionReceipt({ hash });

        logger.info(
          {
            codeId: params.codeId.toString(),
            requester: params.requester,
            runNonce: params.runNonce,
            shardCid: params.shardCid,
            txHash: hash,
          },
          "[IPFS] Shard submission confirmed"
        );
        return;
      } catch (error) {
        attempt += 1;
        logger.error(
          {
            codeId: params.codeId.toString(),
            requester: params.requester,
            runNonce: params.runNonce,
            shardCid: params.shardCid,
            attempt,
            err: error,
          },
          "[IPFS] submitShard failed"
        );
        if (attempt >= MAX_RETRIES || !this.isTooManyRequests(error)) {
          throw error;
        }
        logger.warn(
          {
            codeId: params.codeId.toString(),
            requester: params.requester,
            runNonce: params.runNonce,
            shardCid: params.shardCid,
            attempt,
            delayMs: RETRY_DELAY_MS,
          },
          "[IPFS] submitShard hit RPC 429, retrying"
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  private isTooManyRequests(error: unknown): boolean {
    if (error instanceof HttpRequestError) {
      if (error.status === 429) return true;
      if (
        typeof error.details === "string" &&
        error.details.toLowerCase().includes("too many requests")
      ) {
        return true;
      }
    }
    const message = (error as Error)?.message ?? "";
    return message.includes("429") || message.toLowerCase().includes("too many requests");
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
