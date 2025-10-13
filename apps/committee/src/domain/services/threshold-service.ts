export interface ThresholdService {
  getThreshold(codeId: bigint): Promise<number>;
}
