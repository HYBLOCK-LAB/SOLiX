import { randomBytes } from "crypto";
import type {
  SecretShare,
  SecretSharingService,
  SplitSecretParams,
} from "../../domain/services/secret-sharing-service";

const DEFAULT_PRIME = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f");

export class ShamirSecretSharingService implements SecretSharingService {
  private readonly prime: bigint;
  private readonly primeBitLength: number;
  private readonly primeByteLength: number;

  constructor(prime: bigint = DEFAULT_PRIME) {
    if (prime <= 0) {
      throw new Error("Prime modulus must be positive");
    }

    this.prime = prime;
    this.primeBitLength = prime.toString(2).length;
    this.primeByteLength = Math.ceil(this.primeBitLength / 8);
  }

  split(secret: Uint8Array, params: SplitSecretParams): SecretShare[] {
    if (secret.length === 0) {
      throw new Error("Secret payload must not be empty");
    }

    if (params.threshold <= 0 || params.totalShares <= 0) {
      throw new Error("Threshold and totalShares must be positive");
    }

    if (params.threshold > params.totalShares) {
      throw new Error("Threshold cannot exceed total shares");
    }

    if (params.totalShares > Number.MAX_SAFE_INTEGER) {
      throw new Error("totalShares is too large for safe indexing");
    }

    const secretInt = this.bytesToBigInt(secret);
    if (secretInt >= this.prime) {
      throw new Error(
        `Secret must be smaller than field prime (got bitLength ${secret.length * 8}, prime bitLength ${this.primeBitLength})`
      );
    }

    const coefficients: bigint[] = [secretInt];
    for (let i = 1; i < params.threshold; i += 1) {
      coefficients.push(this.randomLessThanPrime());
    }

    const shares: SecretShare[] = [];
    for (let i = 1; i <= params.totalShares; i += 1) {
      const x = BigInt(i);
      const y = this.evaluatePolynomial(coefficients, x);
      shares.push({
        index: i,
        value: this.bigIntToHex(y),
        byteLength: secret.length,
      });
    }

    return shares;
  }

  combine(shares: SecretShare[]): Uint8Array {
    if (shares.length === 0) {
      throw new Error("At least one share is required to combine");
    }

    const byteLength = shares[0].byteLength;
    if (shares.some((share) => share.byteLength !== byteLength)) {
      throw new Error("All shares must agree on byteLength");
    }

    const seenIndexes = new Set<number>();
    const parsedShares = shares.map((share) => {
      if (seenIndexes.has(share.index)) {
        throw new Error(`Duplicate share index detected: ${share.index}`);
      }
      seenIndexes.add(share.index);
      return {
        x: BigInt(share.index),
        y: this.hexToBigInt(share.value),
      };
    });

    const secretInt =
      parsedShares.length === 1
        ? this.mod(parsedShares[0].y)
        : this.interpolateAtZero(parsedShares);

    return this.bigIntToBytes(secretInt, byteLength);
  }

  private evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
    let result = 0n;
    for (let i = coefficients.length - 1; i >= 0; i -= 1) {
      result = this.mod(result * x + coefficients[i]);
    }
    return result;
  }

  private interpolateAtZero(points: { x: bigint; y: bigint }[]): bigint {
    let sum = 0n;

    for (let i = 0; i < points.length; i += 1) {
      const { x: xi, y: yi } = points[i];
      let numerator = 1n;
      let denominator = 1n;

      for (let j = 0; j < points.length; j += 1) {
        if (i === j) continue;
        const xj = points[j].x;
        numerator = this.mod(numerator * (0n - xj));
        denominator = this.mod(denominator * (xi - xj));
      }

      const lagrangeCoefficient = this.mod(numerator * this.modInverse(denominator));
      sum = this.mod(sum + yi * lagrangeCoefficient);
    }

    return this.mod(sum);
  }

  private randomLessThanPrime(): bigint {
    while (true) {
      const candidate = this.bytesToBigInt(randomBytes(this.primeByteLength));
      if (candidate < this.prime) {
        return candidate;
      }
    }
  }

  private mod(value: bigint): bigint {
    const result = value % this.prime;
    return result >= 0 ? result : result + this.prime;
  }

  private modInverse(value: bigint): bigint {
    if (value === 0n) {
      throw new Error("Attempted to invert zero");
    }
    return this.modPow(this.mod(value), this.prime - 2n);
  }

  private modPow(base: bigint, exponent: bigint): bigint {
    let result = 1n;
    let b = this.mod(base);
    let e = exponent;

    while (e > 0n) {
      if (e & 1n) {
        result = this.mod(result * b);
      }
      b = this.mod(b * b);
      e >>= 1n;
    }

    return result;
  }

  private bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (const byte of bytes) {
      result = (result << 8n) + BigInt(byte);
    }
    return result;
  }

  private bigIntToBytes(value: bigint, length: number): Uint8Array {
    const buffer = new Uint8Array(length);
    let temp = this.mod(value);

    for (let i = length - 1; i >= 0; i -= 1) {
      buffer[i] = Number(temp & 0xffn);
      temp >>= 8n;
    }

    if (temp !== 0n) {
      throw new Error("Secret does not fit into requested byteLength");
    }

    return buffer;
  }

  private bigIntToHex(value: bigint): `0x${string}` {
    return `0x${this.mod(value).toString(16)}` as `0x${string}`;
  }

  private hexToBigInt(value: `0x${string}` | string): bigint {
    const normalized = value.startsWith("0x") ? value.slice(2) : value;
    if (normalized.length === 0) {
      return 0n;
    }
    return BigInt(`0x${normalized}`);
  }
}
