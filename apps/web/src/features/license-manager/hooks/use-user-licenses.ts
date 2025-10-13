"use client";

import { useMemo } from "react";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { LICENSE_MANAGER_ADDRESS } from "../constants";
import { licenseManagerAbi } from "../abi";

const TRANSFER_SINGLE_EVENT = parseAbiItem(
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
);

const TRANSFER_BATCH_EVENT = parseAbiItem(
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
);

export interface UserLicenseSummary {
  codeId: number;
  balance: number;
  expiry: number;
  codeHash: `0x${string}`;
  cipherCid: string;
  paused: boolean;
}

export function useUserLicenses() {
  const account = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["license-manager", "userLicenses", account.address, publicClient?.chain?.id],
    [account.address, publicClient?.chain?.id],
  );

  const query = useQuery({
    queryKey,
    enabled: Boolean(account.address && publicClient),
    staleTime: 30_000,
    queryFn: async (): Promise<UserLicenseSummary[]> => {
      if (!account.address || !publicClient) return [];
      const [singleLogs, batchLogs] = await Promise.all([
        publicClient.getLogs({
          address: LICENSE_MANAGER_ADDRESS,
          event: TRANSFER_SINGLE_EVENT,
          args: { to: account.address },
          fromBlock: BigInt(0),
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: LICENSE_MANAGER_ADDRESS,
          event: TRANSFER_BATCH_EVENT,
          args: { to: account.address },
          fromBlock: BigInt(0),
          toBlock: "latest",
        }),
      ]);

      const codeIds = new Set<number>();
      for (const log of singleLogs) {
        const id = (log.args?.id ?? BigInt(0)) as bigint;
        if (id > BigInt(0)) {
          codeIds.add(Number(id));
        }
      }
      for (const log of batchLogs) {
        const ids = (log.args?.ids ?? []) as readonly bigint[];
        for (const id of ids) {
          if (id > BigInt(0)) {
            codeIds.add(Number(id));
          }
        }
      }

      if (codeIds.size === 0) {
        return [];
      }

      const summaries = await Promise.all(
        Array.from(codeIds).map(async (codeId) => {
          const [balanceRaw, expiryRaw, codeInfoRaw] = await Promise.all([
            publicClient.readContract({
              address: LICENSE_MANAGER_ADDRESS,
              abi: licenseManagerAbi,
              functionName: "balanceOf",
              args: [account.address!, BigInt(codeId)],
            }),
            publicClient.readContract({
              address: LICENSE_MANAGER_ADDRESS,
              abi: licenseManagerAbi,
              functionName: "licenseExpiry",
              args: [account.address!, BigInt(codeId)],
            }),
            publicClient.readContract({
              address: LICENSE_MANAGER_ADDRESS,
              abi: licenseManagerAbi,
              functionName: "code",
              args: [BigInt(codeId)],
            }),
          ]);

          const balance = Number(balanceRaw);
          const expiry = Number(expiryRaw);
          const [codeHash, cipherCid, paused, exists] = codeInfoRaw as readonly [string, string, boolean, boolean];

          if (!exists || balance === 0) {
            return null;
          }

          return {
            codeId,
            balance,
            expiry,
            codeHash: codeHash as `0x${string}`,
            cipherCid: cipherCid ?? "",
            paused,
          };
        }),
      );

      return summaries.filter((summary): summary is UserLicenseSummary => summary !== null).sort((a, b) => b.codeId - a.codeId);
    },
  });

  useWatchContractEvent({
    address: LICENSE_MANAGER_ADDRESS,
    abi: licenseManagerAbi,
    eventName: "TransferSingle",
    enabled: Boolean(account.address),
    onLogs() {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  useWatchContractEvent({
    address: LICENSE_MANAGER_ADDRESS,
    abi: licenseManagerAbi,
    eventName: "TransferBatch",
    enabled: Boolean(account.address),
    onLogs() {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    licenses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
