export interface ShardSubmitParams {
  codeId: bigint;
  runNonce: `0x${string}`;
  shardCid: string;
}

export interface ShardSubmitter {
  submitShard(params: ShardSubmitParams): Promise<void>;
}
