import { createCipheriv, createECDH, createHash, randomBytes } from "crypto";
import type {
  EncryptedShardPayload,
  ShardEncryptor,
  ShardEncryptionInput,
} from "../../domain/services/shard-encryptor";

export class EcdhShardEncryptor implements ShardEncryptor {
  private readonly algorithm = "secp256k1-aes-256-gcm";

  async encrypt(input: ShardEncryptionInput): Promise<EncryptedShardPayload> {
    const recipient = this.normalize(input.recipientPublicKey);
    const share = this.normalize(input.secretShare);

    const ecdh = createECDH("secp256k1");
    ecdh.generateKeys();

    const sharedSecret = ecdh.computeSecret(Buffer.from(recipient, "hex"));
    const key = createHash("sha256").update(sharedSecret).digest();

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(share, "hex")),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      algorithm: this.algorithm,
      ciphertext: `0x${ciphertext.toString("hex")}`,
      iv: `0x${iv.toString("hex")}`,
      authTag: `0x${authTag.toString("hex")}`,
      ephemeralPublicKey: `0x${ecdh.getPublicKey().toString("hex")}`,
    };
  }

  private normalize(value: `0x${string}` | string): string {
    return value.startsWith("0x") ? value.slice(2) : value;
  }
}
