"use client";

import { useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount } from "wagmi";
import type { ContractFunctionArgs, ContractFunctionName } from "viem";
import { licenseManagerAbi } from "../abi";
import { LICENSE_MANAGER_ADDRESS } from "../constants";

type LicenseManagerAbi = typeof licenseManagerAbi;
type LicenseManagerWriteFunctionName = ContractFunctionName<
  LicenseManagerAbi,
  "nonpayable" | "payable"
>;
type LicenseManagerWriteArgs<Name extends LicenseManagerWriteFunctionName> = ContractFunctionArgs<
  LicenseManagerAbi,
  "nonpayable" | "payable",
  Name
>;

export function useLicenseManagerWrite<Name extends LicenseManagerWriteFunctionName>(
  functionName: Name,
) {
  const { data: hash, writeContractAsync, isPending, error: writeError } = useWriteContract();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const wait = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });

  const execute = useCallback(
    async (args: LicenseManagerWriteArgs<Name>) => {
      let gas: bigint | undefined;

      if (publicClient && address) {
        try {
          const params = {
            address: LICENSE_MANAGER_ADDRESS,
            abi: licenseManagerAbi,
            functionName,
            args: args as unknown as Parameters<typeof publicClient.estimateContractGas>[0]["args"],
            account: address,
          } as Parameters<typeof publicClient.estimateContractGas>[0];
          gas = await publicClient.estimateContractGas(params);
        } catch (error) {
          console.warn("Failed to estimate gas, sending without override", error);
          gas = undefined;
        }
      }

      return writeContractAsync({
        address: LICENSE_MANAGER_ADDRESS,
        abi: licenseManagerAbi,
        functionName,
        args: args as unknown as Parameters<typeof writeContractAsync>[0]["args"],
        ...(gas ? { gas } : {}),
      } as Parameters<typeof writeContractAsync>[0]);
    },
    [address, functionName, publicClient, writeContractAsync],
  );

  return {
    execute,
    isPending: isPending || wait.isLoading,
    isSuccess: wait.isSuccess,
    transactionHash: hash,
    error: writeError ?? wait.error,
  };
}
