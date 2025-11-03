import { Buffer } from "buffer";

const HEX_BASE = 16;
const HEX_PAD_LENGTH = 2;
const BASE64_CHUNK_SIZE = 0x8000;

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(HEX_BASE).padStart(HEX_PAD_LENGTH, "0"))
    .join("");
}

export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(index, index + BASE64_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  if (typeof btoa === "undefined") {
    throw new Error("btoa is not available in this environment.");
  }
  return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }

  if (typeof atob === "undefined") {
    throw new Error("atob is not available in this environment.");
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
