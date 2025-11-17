import { bytesToHex, hexToBytes } from "../../utils/hex";
import { AES_GCM_IV_LENGTH_BYTES, AES_KEY_LENGTH_BYTES } from "./constants";

export interface EncryptionBundle {
  keyHex: `0x${string}`;
  ivHex: `0x${string}`;
}

export function packEncryptionBundle(bundle: EncryptionBundle): `0x${string}` {
  const keyBytes = hexToBytes(bundle.keyHex);
  const ivBytes = hexToBytes(bundle.ivHex);
  if (keyBytes.length !== AES_KEY_LENGTH_BYTES) {
    throw new Error(`Expected ${AES_KEY_LENGTH_BYTES} key bytes, got ${keyBytes.length}`);
  }
  if (ivBytes.length !== AES_GCM_IV_LENGTH_BYTES) {
    throw new Error(`Expected ${AES_GCM_IV_LENGTH_BYTES} IV bytes, got ${ivBytes.length}`);
  }

  const combined = new Uint8Array(keyBytes.length + ivBytes.length);
  combined.set(keyBytes, 0);
  combined.set(ivBytes, keyBytes.length);
  return bytesToHex(combined);
}

export function unpackEncryptionBundle(secretHex: `0x${string}`): EncryptionBundle {
  const secretBytes = hexToBytes(secretHex);
  if (secretBytes.length !== AES_KEY_LENGTH_BYTES + AES_GCM_IV_LENGTH_BYTES) {
    throw new Error("복원된 키 길이가 예상과 일치하지 않습니다.");
  }
  const keyBytes = secretBytes.slice(0, AES_KEY_LENGTH_BYTES);
  const ivBytes = secretBytes.slice(AES_KEY_LENGTH_BYTES);
  return {
    keyHex: bytesToHex(keyBytes),
    ivHex: bytesToHex(ivBytes),
  };
}
