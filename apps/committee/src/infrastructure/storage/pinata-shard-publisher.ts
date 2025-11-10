import type { ShardPublication, ShardPublisher } from "../../domain/services/shard-publisher";
import { logger } from "../../shared/logger";

interface PinataResponse {
  IpfsHash: string;
}

export class PinataShardPublisher implements ShardPublisher {
  constructor(private readonly jwt: string) {}

  async publishShard(publication: ShardPublication): Promise<string> {
    logger.info(
      {
        codeId: publication.codeId,
        requester: publication.requester,
        committee: publication.committee,
      },
      '[IPFS] Upload started'
    );

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataMetadata: {
          name: `shard-${publication.codeId}-${publication.requester}-${publication.shareIndex}`,
        },
        pinataContent: publication,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      logger.error(
        {
          status: response.status,
        message,
        codeId: publication.codeId,
        requester: publication.requester,
        committee: publication.committee,
        },
        "[IPFS] Upload failed"
      );
      throw new Error(`Pinata upload failed: ${response.status} ${message}`);
    }

    const payload = (await response.json()) as PinataResponse;
    const cid = payload.IpfsHash.startsWith("ipfs://") ? payload.IpfsHash : `ipfs://${payload.IpfsHash}`;
    logger.info(
      {
        codeId: publication.codeId,
        requester: publication.requester,
        committee: publication.committee,
        cid,
      },
      "[IPFS] Upload succeeded"
    );
    return cid;
  }
}
