export interface SecretShare {
  index: number;
  value: `0x${string}`;
  byteLength: number;
}

export interface SplitSecretParams {
  totalShares: number;
  threshold: number;
}

export interface SecretSharingService {
  split(secret: Uint8Array, params: SplitSecretParams): SecretShare[];
  combine(shares: SecretShare[]): Uint8Array;
}
