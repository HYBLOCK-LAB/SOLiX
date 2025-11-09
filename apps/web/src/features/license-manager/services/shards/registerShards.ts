export interface RegisterShardsParams {
  runId: string;
  secret: string;
  encoding?: "hex" | "base64";
  totalShares: number;
  threshold: number;
  members: { address: `0x${string}`; note?: string }[];
  defaultExpiresInSeconds?: number;
}

export async function registerShards(params: RegisterShardsParams): Promise<void> {
  const response = await fetch("/api/committee/shards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      encoding: params.encoding ?? "hex",
      members: params.members,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ message: response.statusText }))) as {
      message?: string;
    };
    throw new Error(payload.message ?? "Shard registration failed");
  }
}
