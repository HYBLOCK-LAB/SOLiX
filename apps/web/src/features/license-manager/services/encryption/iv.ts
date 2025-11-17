import { hexToBytes } from "../../utils/hex";

export const FIXED_AES_GCM_IV_HEX =
  "0xdeadbeefdeadbeefcafebabe" as `0x${string}`;

export const FIXED_AES_GCM_IV_BYTES = hexToBytes(FIXED_AES_GCM_IV_HEX);
