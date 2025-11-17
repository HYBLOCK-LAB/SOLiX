import type { SecretSharePayload } from "./types";
import { FIELD_PRIME } from "./fieldPrime";

export function combineShares(shares: SecretSharePayload[]): Uint8Array {
  if (shares.length === 0) {
    throw new Error("At least one share is required");
  }

  const byteLengths = shares.map((share) => share.byteLength).filter((length) => length > 0);
  if (byteLengths.length === 0) {
    throw new Error("Shares must include byteLength metadata");
  }
  const minByteLength = Math.min(...byteLengths);
  const maxByteLength = Math.max(...byteLengths);
  if (minByteLength !== maxByteLength) {
    console.warn("[combineShares] Inconsistent byteLength detected", {
      byteLengths,
      chosenByteLength: maxByteLength,
    });
  }
  const byteLength = maxByteLength;

  const parsed = shares.map((share) => ({
    x: BigInt(share.index),
    y: hexToBigInt(share.value),
  }));
  console.log("[combineShares] Input shares", {
    count: shares.length,
    expectedByteLength: byteLength,
    shareByteLengths: shares.map((share) => share.byteLength),
  });

  const secretInt = parsed.length === 1 ? mod(parsed[0].y) : interpolateAtZero(parsed);
  return bigIntToBytes(secretInt, byteLength);
}

function interpolateAtZero(points: { x: bigint; y: bigint }[]): bigint {
  let sum = 0n;

  for (let i = 0; i < points.length; i += 1) {
    const { x: xi, y: yi } = points[i];
    let numerator = 1n;
    let denominator = 1n;

    for (let j = 0; j < points.length; j += 1) {
      if (i === j) continue;
      const xj = points[j].x;
      numerator = mod(numerator * (0n - xj));
      denominator = mod(denominator * (xi - xj));
    }

    const lagrange = mod(numerator * modInverse(denominator));
    sum = mod(sum + yi * lagrange);
  }

  return mod(sum);
}

function mod(value: bigint): bigint {
  const result = value % FIELD_PRIME;
  return result >= 0 ? result : result + FIELD_PRIME;
}

function modInverse(value: bigint): bigint {
  if (value === 0n) {
    throw new Error("Cannot invert zero");
  }
  return modPow(mod(value), FIELD_PRIME - 2n);
}

function modPow(base: bigint, exponent: bigint): bigint {
  let result = 1n;
  let b = mod(base);
  let e = exponent;

  while (e > 0n) {
    if (e & 1n) {
      result = mod(result * b);
    }
    b = mod(b * b);
    e >>= 1n;
  }

  return result;
}

function hexToBigInt(value: `0x${string}`): bigint {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  return BigInt(`0x${normalized}`);
}

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  if (length <= 0) {
    throw new Error("byteLength must be positive");
  }

  const normalized = mod(value);
  const requiredLength =
    normalized === 0n ? 1 : Math.ceil(normalized.toString(2).length / 8);
  const targetLength = Math.max(length, requiredLength);
  if (targetLength !== length) {
    console.warn("[combineShares] Expanding byteLength for recovered secret", {
      requestedByteLength: length,
      requiredByteLength: requiredLength,
      targetLength,
    });
  }

  const buffer = new Uint8Array(targetLength);
  let temp = normalized;

  for (let i = targetLength - 1; i >= 0; i -= 1) {
    buffer[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }

  return buffer;
}
