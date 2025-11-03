import { clientEnv } from "./env";

export const STORAGE_MODES = {
  LOCAL: "local",
  PRODUCTION: "production",
} as const;

export type StorageMode = (typeof STORAGE_MODES)[keyof typeof STORAGE_MODES];

export const storageMode: StorageMode = clientEnv.NEXT_PUBLIC_STORAGE_MODE;

export const isProductionStorage = storageMode === STORAGE_MODES.PRODUCTION;
