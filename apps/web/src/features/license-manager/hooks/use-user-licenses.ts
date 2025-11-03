"use client";

import { useCallback, useMemo } from "react";
import type { Address } from "viem";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LICENSE_MANAGER_ADDRESS } from "../constants";
import { licenseManagerAbi } from "../abi";
import type { UserLicenseSummary } from "../types";
import {
  collectUserLicenseIds,
  loadLicenseSummary,
  pickCodeIdsFromTransferBatchLogs,
  pickCodeIdsFromTransferSingleLogs,
} from "../services/license-summary";

export function useUserLicenses() {
  const account = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const accountAddress = account.address as Address | undefined;

  const queryKey = useMemo(() => {
    return ["license-manager", "userLicenses", accountAddress, publicClient?.chain?.id];
  }, [accountAddress, publicClient?.chain?.id]);

  const loadSummaries = useCallback(async (): Promise<UserLicenseSummary[]> => {
    if (!accountAddress || !publicClient) return [];

    const codeIds = await collectUserLicenseIds({
      client: publicClient,
      account: accountAddress,
    });

    if (codeIds.length === 0) {
      return [];
    }

    const summaries = await Promise.all(
      codeIds.map((codeId) =>
        loadLicenseSummary({
          client: publicClient,
          account: accountAddress,
          codeId,
        }),
      ),
    );

    return summaries
      .filter((summary): summary is UserLicenseSummary => summary !== null)
      .sort((a, b) => b.codeId - a.codeId);
  }, [accountAddress, publicClient]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(accountAddress && publicClient),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    queryFn: loadSummaries,
  });

  useWatchContractEvent({
    address: LICENSE_MANAGER_ADDRESS,
    abi: licenseManagerAbi,
    eventName: "TransferSingle",
    enabled: Boolean(accountAddress && publicClient),
    async onLogs(logs) {
      if (!accountAddress || !publicClient || logs.length === 0) return;

      const relevantCodeIds = pickCodeIdsFromTransferSingleLogs(accountAddress, logs);
      if (relevantCodeIds.length === 0) return;

      const uniqueCodeIds = new Set(relevantCodeIds);

      const updates = await Promise.all(
        Array.from(uniqueCodeIds).map((codeId) =>
          loadLicenseSummary({
            client: publicClient,
            account: accountAddress,
            codeId,
          }),
        ),
      );

      queryClient.setQueryData<UserLicenseSummary[] | undefined>(queryKey, (current = []) => {
        const filtered = current.filter((item) => !uniqueCodeIds.has(item.codeId));
        updates
          .filter((summary): summary is UserLicenseSummary => summary !== null)
          .forEach((summary) => {
            filtered.push(summary);
          });
        return filtered.sort((a, b) => b.codeId - a.codeId);
      });
    },
  });

  useWatchContractEvent({
    address: LICENSE_MANAGER_ADDRESS,
    abi: licenseManagerAbi,
    eventName: "TransferBatch",
    enabled: Boolean(accountAddress && publicClient),
    async onLogs(logs) {
      if (!accountAddress || !publicClient || logs.length === 0) return;

      const relevantCodeIds = pickCodeIdsFromTransferBatchLogs(accountAddress, logs);
      if (relevantCodeIds.length === 0) return;

      const uniqueCodeIds = new Set(relevantCodeIds);

      const updates = await Promise.all(
        Array.from(uniqueCodeIds).map((codeId) =>
          loadLicenseSummary({
            client: publicClient,
            account: accountAddress,
            codeId,
          }),
        ),
      );

      queryClient.setQueryData<UserLicenseSummary[] | undefined>(queryKey, (current = []) => {
        const filtered = current.filter((item) => !uniqueCodeIds.has(item.codeId));
        updates
          .filter((summary): summary is UserLicenseSummary => summary !== null)
          .forEach((summary) => {
            filtered.push(summary);
          });
        return filtered.sort((a, b) => b.codeId - a.codeId);
      });
    },
  });

  return {
    licenses: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
  };
}
