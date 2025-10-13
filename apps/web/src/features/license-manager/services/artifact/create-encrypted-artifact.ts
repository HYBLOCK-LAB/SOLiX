import { hashFile } from "../../utils/hash-file";
import { encryptWithAesGcm } from "../encryption";
import type { EncryptedArtifact } from "./types";

export async function createEncryptedArtifact(file: File): Promise<EncryptedArtifact> {
  const fileArrayBuffer = await file.arrayBuffer();
  const encryptionResult = await encryptWithAesGcm(fileArrayBuffer);
  const codeHash = await hashFile(file);

  return {
    fileName: file.name,
    codeHash,
    cipherBytes: encryptionResult.cipherBytes,
    keyHex: encryptionResult.keyHex,
    ivHex: encryptionResult.ivHex,
    algorithm: encryptionResult.algorithm,
    size: encryptionResult.cipherBytes.length,
  };
}
