export interface EvidenceUploader {
  upload(runId: string, cids: string[]): Promise<string | null>;
}
