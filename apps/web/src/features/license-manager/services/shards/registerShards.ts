export interface RegisterShardsParams {
  codeId: string;
  wallet: `0x${string}`;
  shards: Array<{
    committee: `0x${string}`;
    runNonce: string;
    shareIndex: number;
    shareValue: `0x${string}`;
    byteLength: number;
    expiresAt?: string;
    note?: string;
  }>;
}

export async function registerShards(params: RegisterShardsParams): Promise<void> {
  const response = await fetch(`/api/committee/codes/${params.codeId}/shards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet: params.wallet, shards: params.shards }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ message: response.statusText }))) as {
      message?: string;
    };
    throw new Error(payload.message ?? "Shard registration failed");
  }
}
