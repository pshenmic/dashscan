import {BlockchainInfoRPC} from "../dashcoreRPC";

interface ChainStatsObject {
  chain?: string;
  sizeOnDisk?: number;
  difficulty?: number;
  blockTime?: number;
  transactionsPerSecond?: number;
  transactionsPerMinute?: number;
  latestHeight: number;
}

export default class ChainStats {
  chain: string | null;
  sizeOnDisk: number | null;
  difficulty: number | null;
  blockTime: number | null;
  transactionsPerSecond: number | null;
  transactionsPerMinute: number | null;
  latestHeight: number | null;

  constructor(chain?: string, sizeOnDisk?: number, difficulty?: number, blockTime?: number, transactionsPerSecond?: number, transactionsPerMinute?: number, latestHeight?: number) {
    this.chain = chain ?? null;
    this.sizeOnDisk = sizeOnDisk ?? null;
    this.difficulty = difficulty ?? null;
    this.blockTime = blockTime ?? null;
    this.transactionsPerSecond = transactionsPerSecond ?? null;
    this.transactionsPerMinute = transactionsPerMinute ?? null;
    this.latestHeight = latestHeight ?? null;
  }

  static fromRpcResponse({chain, size_on_disk, difficulty}: BlockchainInfoRPC): ChainStats {
    return new ChainStats(chain, size_on_disk, difficulty);
  }

  static fromObject({chain, sizeOnDisk, difficulty, blockTime, transactionsPerSecond, transactionsPerMinute, latestHeight}: ChainStatsObject): ChainStats {
    return new ChainStats(chain, sizeOnDisk, difficulty, blockTime, transactionsPerSecond, transactionsPerMinute, latestHeight);
  }
}