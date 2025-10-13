import type { EncryptionResult } from "../encryption";

export interface EncryptedArtifact extends EncryptionResult {
  fileName: string;
  codeHash: `0x${string}`;
  size: number;
}

export interface UploadResponsePayload {
  cipherCid: string;
}

export interface CodeRegistrationArtifact {
  codeHash: `0x${string}`;
  cipherCid: string;
  encryptionKeyHex: string;
  initializationVectorHex: string;
  algorithm: string;
  size: number;
}
