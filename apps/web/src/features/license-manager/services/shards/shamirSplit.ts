import { hexToBytes } from "../../utils/hex";
import { FIELD_PRIME } from "./fieldPrime";

export interface SplitShare {
  index: number;
  value: `0x${string}`;
  byteLength: number;
}

export function splitSecret(secretHex: `0x${string}`, totalShares: number, threshold: number): SplitShare[] {
  if (!secretHex) {
    throw new Error("Secret payload is empty");
  }
  if (totalShares <= 0 || threshold <= 0) {
    throw new Error("totalShares and threshold must be positive");
  }
  if (threshold > totalShares) {
    throw new Error("threshold cannot exceed totalShares");
  }

  const secretBytes = hexToBytes(secretHex);
  if (secretBytes.length === 0) {
    throw new Error("Secret payload must not be empty");
  }

  const secretInt = bytesToBigInt(secretBytes);
  if (secretInt >= FIELD_PRIME) {
    throw new Error("Secret must be smaller than field prime");
  }

  const coefficients: bigint[] = [secretInt];
  for (let i = 1; i < threshold; i += 1) {
    coefficients.push(randomLessThanPrime());
  }

  const shares: SplitShare[] = [];
  for (let i = 1; i <= totalShares; i += 1) {
    const y = evaluatePolynomial(coefficients, BigInt(i));
    shares.push({
      index: i,
      value: bigIntToHex(y),
      byteLength: secretBytes.length,
    });
  }

  return shares;
}

function evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
  let result = 0n;
  for (let i = coefficients.length - 1; i >= 0; i -= 1) {
    result = mod(result * x + coefficients[i]);
  }
  return result;
}

function randomLessThanPrime(): bigint {
  while (true) {
    const candidate = bytesToBigInt(randomBytes(primeByteLength()));
    if (candidate < FIELD_PRIME) {
      return candidate;
    }
  }
}

function randomBytes(length: number): Uint8Array {
  const buffer = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buffer);
    return buffer;
  }
  throw new Error("Secure random generation is not available in this environment");
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) + BigInt(byte);
  }
  return result;
}

function bigIntToHex(value: bigint): `0x${string}` {
  const hex = mod(value).toString(16);
  const padded = hex.length % 2 === 0 ? hex : `0${hex}`;
  return `0x${padded}` as `0x${string}`;
}

function mod(value: bigint): bigint {
  const result = value % FIELD_PRIME;
  return result >= 0 ? result : result + FIELD_PRIME;
}

let cachedPrimeByteLength: number | undefined;
function primeByteLength() {
  if (cachedPrimeByteLength === undefined) {
    cachedPrimeByteLength = Math.ceil(FIELD_PRIME.toString(2).length / 8);
  }
  return cachedPrimeByteLength;
}
