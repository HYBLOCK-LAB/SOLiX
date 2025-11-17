// 2^521 - 1 (Mersenne prime) to allow secrets longer than 32 bytes (key + IV bundles)
export const FIELD_PRIME =
  BigInt(
    "0x1ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  );
