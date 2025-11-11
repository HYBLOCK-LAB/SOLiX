import type { PublicClient } from "viem";
import { committeeAbi } from "../../infrastructure/blockchain/committee-abi";
import { logger } from "../../shared/logger";

export class CommitteeThresholdProvider {
  private cached?: number;

  constructor(
    private readonly client: PublicClient,
    private readonly committeeAddress: `0x${string}`
  ) {}

  async getThreshold(): Promise<number> {
    if (this.cached && this.cached > 0) {
      return this.cached;
    }
    try {
      const value = await this.client.readContract({
        address: this.committeeAddress,
        abi: committeeAbi,
        functionName: "committeeThreshold",
      });
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.cached = parsed;
        return parsed;
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to read committeeThreshold");
    }

    if (!this.cached || this.cached <= 0) {
      this.cached = 1;
      logger.warn(
        { fallback: this.cached },
        "committeeThreshold fallback applied"
      );
    }
    return this.cached;
  }

  invalidate() {
    this.cached = undefined;
  }
}
