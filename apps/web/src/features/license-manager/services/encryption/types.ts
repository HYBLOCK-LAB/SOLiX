export interface EncryptionResult {
  cipherBytes: Uint8Array;
  keyHex: string;
  ivHex: string;
  algorithm: string;
}
