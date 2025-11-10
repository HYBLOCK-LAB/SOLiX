import type { Account, PublicClient, WalletClient } from "viem";
import type { ShardSubmitParams, ShardSubmitter } from "../../domain/services/shard-submitter";
import { committeeAbi } from "./committee-abi";
import { logger } from "../../shared/logger";

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
  }
}
