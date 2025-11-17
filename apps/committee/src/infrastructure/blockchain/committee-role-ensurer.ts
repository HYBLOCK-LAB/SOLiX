import type { Account, PublicClient, WalletClient } from "viem";
import { committeeAbi } from "./committee-abi";
import { logger } from "../../shared/logger";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class CommitteeRoleEnsurer {
  constructor(
    private readonly publicClient: PublicClient,
    private readonly walletClient: WalletClient,
    private readonly contractAddress: `0x${string}`,
    private readonly account: Account
  ) {}

  async ensureRole(committeeAddress: `0x${string}`): Promise<void> {
    while (true) {
      try {
        const role = await this.publicClient.readContract({
          address: this.contractAddress,
          abi: committeeAbi,
          functionName: "COMMITTEE_ROLE",
        });

        const hasRole = await this.publicClient.readContract({
          address: this.contractAddress,
          abi: committeeAbi,
          functionName: "hasRole",
          args: [role, committeeAddress],
        });
        if (hasRole) {
          logger.info(
            { committeeAddress },
            "[On-chain] Committee role already granted"
          );
          return;
        }

        logger.info(
          { committeeAddress },
          "[On-chain] Granting COMMITTEE_ROLE to committee node"
        );
        const hash = await this.walletClient.writeContract({
          address: this.contractAddress,
          abi: committeeAbi,
          functionName: "addCommittee",
          args: [committeeAddress],
          account: this.account,
          chain: undefined,
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        logger.info(
          { committeeAddress, txHash: hash },
          "[On-chain] Committee role granted"
        );
        return;
      } catch (error) {
        logger.error(
          { err: error, committeeAddress },
          "[On-chain] Failed to ensure COMMITTEE_ROLE, continuing without change"
        );
        await sleep(10_000);
      }
    }
  }
}
