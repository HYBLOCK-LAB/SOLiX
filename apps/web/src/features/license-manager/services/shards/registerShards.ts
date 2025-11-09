export interface RegisterShardsParams {
  runId: string;
  totalShares: number;
  threshold: number;
  shards: Array<{
    committee: `0x${string}`;
    shareIndex: number;
    shareValue: `0x${string}`;
    byteLength: number;
    expiresAt?: string;
    note?: string;
  }>;
}

export async function registerShards(params: RegisterShardsParams): Promise<void> {
  const response = await fetch("/api/committee/shards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ message: response.statusText }))) as {
      message?: string;
    };
    throw new Error(payload.message ?? "Shard registration failed");
  }
}
