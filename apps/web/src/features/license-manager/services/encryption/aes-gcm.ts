import { toHex } from "../../utils/byte-encoding";
import type { EncryptionResult } from "./types";

const AES_ALGORITHM = "AES-GCM";
const AES_KEY_LENGTH_BITS = 256;
const AES_GCM_IV_LENGTH_BYTES = 12;

const AES_USAGES: KeyUsage[] = ["encrypt"];

function getCrypto(): Crypto {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  return globalThis.crypto;
}

function createInitializationVector(): Uint8Array {
  const crypto = getCrypto();
  const iv = new Uint8Array(AES_GCM_IV_LENGTH_BYTES);
  crypto.getRandomValues(iv);
  return iv;
}

async function generateKey(): Promise<CryptoKey> {
  const crypto = getCrypto();
  return crypto.subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH_BITS,
    },
    true,
    AES_USAGES,
  );
}

export async function encryptWithAesGcm(payload: BufferSource): Promise<EncryptionResult> {
  const crypto = getCrypto();
  const key = await generateKey();
  const iv = createInitializationVector();

  const payloadView =
    payload instanceof Uint8Array ? payload : new Uint8Array(payload as ArrayBuffer);
  const normalizedPayload =
    payloadView.byteOffset === 0 && payloadView.byteLength === payloadView.buffer.byteLength
      ? payloadView
      : payloadView.slice();

  const payloadArrayBuffer =
    normalizedPayload.byteOffset === 0 &&
    normalizedPayload.byteLength === normalizedPayload.buffer.byteLength
      ? normalizedPayload.buffer
      : normalizedPayload.buffer.slice(
          normalizedPayload.byteOffset,
          normalizedPayload.byteOffset + normalizedPayload.byteLength,
        );

  const ivArrayBuffer =
    iv.byteOffset === 0 && iv.byteLength === iv.buffer.byteLength
      ? iv.buffer
      : iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: ivArrayBuffer as ArrayBuffer },
    key,
    payloadArrayBuffer as ArrayBuffer,
  );
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const cipherBytes = new Uint8Array(cipherBuffer);

  return {
    cipherBytes,
    keyHex: toHex(rawKey),
    ivHex: toHex(iv),
    algorithm: AES_ALGORITHM,
  };
}
