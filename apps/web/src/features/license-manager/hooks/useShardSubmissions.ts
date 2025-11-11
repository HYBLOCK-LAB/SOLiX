import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { COMMITTEE_MANAGER_ADDRESS } from "../constants";

const SHARD_SUBMITTED_EVENT = parseAbiItem(
  "event ShardSubmitted(uint256 indexed codeId, address indexed requester, bytes32 indexed runNonce, address committee, string shardCid, uint256 countAfter, uint256 threshold)",
);

export interface ShardSubmission {
  committee: `0x${string}`;
  shardCid: string;
  approvals: number;
  threshold: number;
  requester: `0x${string}`;
  runNonce: `0x${string}`;
  blockNumber: bigint;
}

export interface ShardRun {
  requester: `0x${string}`;
  runNonce: `0x${string}`;
  threshold: number;
  shards: ShardSubmission[];
  lastUpdatedBlock: bigint;
}

export function useShardSubmissions(codeId?: number | null, runNonce?: `0x${string}` | null) {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => [
      "committee-manager",
      "shards",
      publicClient?.chain?.id,
      codeId ?? "none",
      runNonce ?? "all",
    ],
    [publicClient?.chain?.id, codeId, runNonce],
  );

  const query = useQuery({
    queryKey,
    enabled: Boolean(publicClient && typeof codeId === "number" && codeId >= 0),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    queryFn: async (): Promise<ShardRun[]> => {
      if (!publicClient || codeId == null) return [];

      const logs = await publicClient.getLogs({
        address: COMMITTEE_MANAGER_ADDRESS,
        event: SHARD_SUBMITTED_EVENT,
        args: { codeId: BigInt(codeId) },
        fromBlock: 0n,
        toBlock: "latest",
      });

      const groups = new Map<string, ShardRun>();
      for (const log of logs) {
        const requester =
          (log.args.requester as `0x${string}`) ??
          ("0x0000000000000000000000000000000000000000" as `0x${string}`);
        const runNonceValue = (log.args.runNonce as `0x${string}`) ?? ("0x0" as `0x${string}`);
        if (runNonce && runNonce.toLowerCase() !== runNonceValue.toLowerCase()) {
          continue;
        }
        const groupKey = `${requester.toLowerCase()}:${runNonceValue.toLowerCase()}`;
        const shard: ShardSubmission = {
          committee: (log.args.committee as `0x${string}`) ?? ("0x0" as `0x${string}`),
          shardCid: typeof log.args.shardCid === "string" ? log.args.shardCid : "",
          approvals: Number(log.args.countAfter ?? 0n),
          threshold: Number(log.args.threshold ?? 0n),
          requester,
          runNonce: runNonceValue,
          blockNumber: log.blockNumber ?? 0n,
        };

        const existing = groups.get(groupKey) ?? {
          requester,
          runNonce: runNonceValue,
          threshold: shard.threshold,
          shards: [],
          lastUpdatedBlock: 0n,
        };

        existing.threshold = shard.threshold;
        existing.shards = [
          ...existing.shards.filter((item) => item.committee !== shard.committee),
          shard,
        ];
        existing.lastUpdatedBlock = log.blockNumber ?? existing.lastUpdatedBlock;
        groups.set(groupKey, existing);
      }

      return Array.from(groups.values()).sort((a, b) =>
        Number(b.lastUpdatedBlock - a.lastUpdatedBlock),
      );
    },
  });

  useEffect(() => {
    if (!publicClient || codeId == null || codeId < 0) return;
    queryClient.invalidateQueries({ queryKey }).catch(() => undefined);
  }, [publicClient, codeId, runNonce, queryClient, queryKey]);

  return {
    runs: query.data ?? [],
    latestRun: query.data?.[0] ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
