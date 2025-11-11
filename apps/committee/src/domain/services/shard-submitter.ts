export interface ShardSubmitParams {
  codeId: bigint;
  requester: `0x${string}`;
  runNonce: `0x${string}`;
  shardCid: string;
}

export interface ShardSubmitter {
  submitShard(params: ShardSubmitParams): Promise<void>;
}
