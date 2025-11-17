import { clientEnv } from "../../lib/env";

export const LICENSE_MANAGER_ADDRESS =
  clientEnv.NEXT_PUBLIC_CONTRACT_LICENSE_ADDRESS as `0x${string}`;
export const COMMITTEE_MANAGER_ADDRESS =
  clientEnv.NEXT_PUBLIC_CONTRACT_COMMITTEE_ADDRESS as `0x${string}`;
