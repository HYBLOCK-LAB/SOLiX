import type { Account, PublicClient, WalletClient } from "viem";
import { committeeAbi } from "./committee-abi";
import type { ExecutionApprover } from "../../domain/services/execution-approver";

export class BlockchainExecutionApprover implements ExecutionApprover {
  constructor(
    private readonly walletClient: WalletClient,
    private readonly publicClient: PublicClient,
    private readonly contractAddress: `0x${string}`,
    private readonly account: Account
  ) {}

  async approve(runId: string, codeId: bigint, encryptedPieceCids: string[]): Promise<void> {
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: committeeAbi,
      functionName: "approveExecution",
      args: [runId as `0x${string}`, codeId, encryptedPieceCids],
      account: this.account,
      chain: undefined,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
  }
}
