import type { EvidenceUploader } from "../../domain/services/evidence-uploader";

export class NoopEvidenceUploader implements EvidenceUploader {
  async upload(): Promise<string | null> {
    return null;
  }
}
