export interface UserLicenseSummary {
  codeId: number;
  balance: number;
  expiry: number;
  codeHash: `0x${string}`;
  cipherCid: string;
  paused: boolean;
}
