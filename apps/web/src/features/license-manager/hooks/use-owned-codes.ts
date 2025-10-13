"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { LICENSE_MANAGER_ADDRESS } from "../constants";
import { licenseManagerAbi } from "../abi";

const CODE_REGISTERED_EVENT = parseAbiItem(
  "event CodeRegistered(uint256 indexed codeId, bytes32 codeHash, string cipherCid, address indexed publisher)",
);

export interface OwnedCode {
  codeId: number;
  codeHash: `0x${string}`;
  cipherCid: string;
}

export function useOwnedCodes() {
  const account = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["license-manager", "ownedCodes", account.address, publicClient?.chain?.id],
    [account.address, publicClient?.chain?.id],
  );

  const query = useQuery({
    queryKey,
    enabled: Boolean(account.address && publicClient),
    queryFn: async (): Promise<OwnedCode[]> => {
      if (!account.address || !publicClient) return [];
      const logs = await publicClient.getLogs({
        address: LICENSE_MANAGER_ADDRESS,
        event: CODE_REGISTERED_EVENT,
        args: { publisher: account.address },
        fromBlock: BigInt(0),
        toBlock: "latest",
      });

      const codes = new Map<number, OwnedCode>();
      for (const log of logs) {
        const { codeId, codeHash, cipherCid, publisher } = log.args;
        if (!publisher || publisher.toLowerCase() !== account.address.toLowerCase()) continue;
        const numericCodeId = Number(codeId);
        codes.set(numericCodeId, {
          codeId: numericCodeId,
          codeHash: codeHash as `0x${string}`,
          cipherCid: typeof cipherCid === "string" ? cipherCid : "",
        });
      }

      return Array.from(codes.values()).sort((a, b) => b.codeId - a.codeId);
    },
    staleTime: 30_000,
  });

  useWatchContractEvent({
    address: LICENSE_MANAGER_ADDRESS,
    abi: licenseManagerAbi,
    eventName: "CodeRegistered",
    enabled: Boolean(account.address),
    onLogs(logs) {
      if (!account.address) return;
      const hasNewForOwner = logs.some((log) => {
        const publisher = (log as { args?: { publisher?: string } }).args?.publisher;
        return publisher && publisher.toLowerCase() === account.address?.toLowerCase();
      });
      if (hasNewForOwner) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  return {
    codes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
