import type { PublicClient } from "viem";
import type { ThresholdService } from "../../domain/services/threshold-service";
import { committeeAbi } from "./committee-abi";

export class BlockchainThresholdService implements ThresholdService {
  constructor(
    private readonly client: PublicClient,
    private readonly contractAddress: `0x${string}`
  ) {}

  async getThreshold(codeId: bigint): Promise<number> {
    const threshold = await this.client.readContract({
      address: this.contractAddress,
      abi: committeeAbi,
      functionName: "getThreshold",
      args: [codeId],
    });

    if (typeof threshold === "bigint") {
      return Number(threshold);
    }

    if (Array.isArray(threshold) && threshold.length > 0 && typeof threshold[0] === "bigint") {
      return Number(threshold[0]);
    }

    throw new Error("Unexpected threshold response");
  }
}
