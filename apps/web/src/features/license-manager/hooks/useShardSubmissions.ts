import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { COMMITTEE_MANAGER_ADDRESS } from "../constants";
import { committeeManagerAbi } from "../committeeManagerAbi";

const SHARD_SUBMITTED_EVENT = parseAbiItem(
  "event ShardSubmitted(uint256 indexed codeId, bytes32 indexed runNonce, address indexed committee, string shardCid, uint256 approvals, uint256 threshold)"
);

export interface ShardSubmission {
  committee: `0x${string}`;
  shardCid: string;
  approvals: number;
  threshold: number;
  runNonce: `0x${string}`;
  blockNumber: bigint;
}

export interface ShardRun {
  runNonce: `0x${string}`;
  threshold: number;
  shards: ShardSubmission[];
  lastUpdatedBlock: bigint;
}

export function useShardSubmissions(codeId?: number | null) {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["committee-manager", "shards", publicClient?.chain?.id, codeId ?? "none"],
    [publicClient?.chain?.id, codeId]
  );

  const query = useQuery({
    queryKey,
    enabled: Boolean(publicClient && typeof codeId === "number" && codeId >= 0),
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
        const runNonce = (log.args.runNonce as `0x${string}`) ?? ("0x0" as `0x${string}`);
        const shard: ShardSubmission = {
          committee: (log.args.committee as `0x${string}`) ?? ("0x0" as `0x${string}`),
          shardCid: typeof log.args.shardCid === "string" ? log.args.shardCid : "",
          approvals: Number(log.args.approvals ?? 0n),
          threshold: Number(log.args.threshold ?? 0n),
          runNonce,
          blockNumber: log.blockNumber ?? 0n,
        };

        const existing = groups.get(runNonce) ?? {
          runNonce,
          threshold: shard.threshold,
          shards: [],
          lastUpdatedBlock: 0n,
        };

        existing.threshold = shard.threshold;
        existing.shards = [...existing.shards.filter((item) => item.committee !== shard.committee), shard];
        existing.lastUpdatedBlock = log.blockNumber ?? existing.lastUpdatedBlock;
        groups.set(runNonce, existing);
      }

      return Array.from(groups.values()).sort((a, b) => Number(b.lastUpdatedBlock - a.lastUpdatedBlock));
    },
  });

  useWatchContractEvent({
    address: COMMITTEE_MANAGER_ADDRESS,
    abi: committeeManagerAbi,
    eventName: "ShardSubmitted",
    args: codeId != null ? { codeId: BigInt(codeId) } : undefined,
    onLogs: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    runs: query.data ?? [],
    latestRun: query.data?.[0] ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
