import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { LICENSE_MANAGER_ADDRESS } from "../constants";
import { licenseManagerAbi } from "../abi";

const CODE_REGISTERED_EVENT = parseAbiItem(
  "event CodeRegistered(uint256 indexed codeId, bytes32 codeHash, string cipherCid, address indexed publisher)",
);

export interface RegisteredCode {
  codeId: number;
  codeHash: `0x${string}`;
  cipherCid: string;
  publisher: `0x${string}`;
}

export function useRegisteredCodes() {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["license-manager", "registeredCodes", publicClient?.chain?.id],
    [publicClient?.chain?.id],
  );

  const query = useQuery({
    queryKey,
    enabled: Boolean(publicClient),
    staleTime: 30_000,
    queryFn: async (): Promise<RegisteredCode[]> => {
      if (!publicClient) return [];

      const logs = await publicClient.getLogs({
        address: LICENSE_MANAGER_ADDRESS,
        event: CODE_REGISTERED_EVENT,
        fromBlock: BigInt(0),
        toBlock: "latest",
      });

      const codes = new Map<number, RegisteredCode>();
      for (const log of logs) {
        const { codeId, codeHash, cipherCid, publisher } = log.args;
        if (typeof codeId === "undefined") continue;
        const numericCodeId = Number(codeId);
        codes.set(numericCodeId, {
          codeId: numericCodeId,
          codeHash: (codeHash ?? "0x0") as `0x${string}`,
          cipherCid: typeof cipherCid === "string" ? cipherCid : "",
          publisher: (publisher ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
        });
      }

      return Array.from(codes.values()).sort((a, b) => b.codeId - a.codeId);
    },
  });

  useWatchContractEvent({
    address: LICENSE_MANAGER_ADDRESS,
    abi: licenseManagerAbi,
    eventName: "CodeRegistered",
    enabled: Boolean(publicClient),
    onLogs() {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    codes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
