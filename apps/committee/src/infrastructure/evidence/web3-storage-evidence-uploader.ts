import type { EvidenceUploader } from "../../domain/services/evidence-uploader";

interface Web3StorageResponse {
  cid: string;
}

export class Web3StorageEvidenceUploader implements EvidenceUploader {
  constructor(private readonly token: string) {}

  async upload(runId: string, cids: string[]): Promise<string | null> {
    const payload = {
      runId,
      cids,
      createdAt: new Date().toISOString(),
    };

    const response = await fetch("https://api.web3.storage/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Web3.Storage upload failed: ${errorText}`);
    }

    const data = (await response.json()) as Web3StorageResponse;
    return data.cid;
  }
}
