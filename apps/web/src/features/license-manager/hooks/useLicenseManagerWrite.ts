"use client";

import { useMemo } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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

  const wait = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });

  const execute = useMemo(
    () => async (args: LicenseManagerWriteArgs<Name>) =>
      writeContractAsync({
        address: LICENSE_MANAGER_ADDRESS,
        abi: licenseManagerAbi,
        functionName,
        args,
      } as Parameters<typeof writeContractAsync>[0]),
    [functionName, writeContractAsync],
  );

  return {
    execute,
    isPending: isPending || wait.isLoading,
    isSuccess: wait.isSuccess,
    transactionHash: hash,
    error: writeError ?? wait.error,
  };
}
