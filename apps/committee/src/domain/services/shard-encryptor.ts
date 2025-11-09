export interface ShardEncryptionInput {
  recipientPublicKey: `0x${string}`;
  secretShare: `0x${string}`;
}

export interface EncryptedShardPayload {
  algorithm: string;
  ciphertext: `0x${string}`;
  iv: `0x${string}`;
  authTag: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
}

export interface ShardEncryptor {
  encrypt(input: ShardEncryptionInput): Promise<EncryptedShardPayload>;
}
