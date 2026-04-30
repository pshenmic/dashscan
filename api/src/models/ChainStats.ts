import {BlockchainInfoRPC} from "../dashcoreRPC";

interface ChainStatsObject {
  chain?: string;
  sizeOnDisk?: number;
  difficulty?: number;
  blockTime?: number;
  transactionsPerSecond?: number;
  transactionsPerMinute?: number;
  latestHeight?: number;
  hashRate?: string;
  mempoolSize?: number;
}

interface ChainStatsRow {
  latest_height: string | number | null;
  last_timestamp: string | Date | null;
  first_timestamp: string | Date | null;
  bt_first_timestamp: string | Date | null;
  bt_tx_count: string | number | null;
  bt_sample_size: string | number | null;
  work_sum: string | number | null;
  mempool_size: string | number | null;
}

export default class ChainStats {
  chain: string | null;
  sizeOnDisk: number | null;
  difficulty: number | null;
  blockTime: number | null;
  transactionsPerSecond: number | null;
  transactionsPerMinute: number | null;
  latestHeight: number | null;
  hashRate: string | null;
  mempoolSize: number | null;

  constructor(chain?: string, sizeOnDisk?: number, difficulty?: number, blockTime?: number, transactionsPerSecond?: number, transactionsPerMinute?: number, latestHeight?: number, hashRate?: string, mempoolSize?: number) {
    this.chain = chain ?? null;
    this.sizeOnDisk = sizeOnDisk ?? null;
    this.difficulty = difficulty ?? null;
    this.blockTime = blockTime ?? null;
    this.transactionsPerSecond = transactionsPerSecond ?? null;
    this.transactionsPerMinute = transactionsPerMinute ?? null;
    this.latestHeight = latestHeight ?? null;
    this.hashRate = hashRate ?? null;
    this.mempoolSize = mempoolSize ?? null;
  }

  static fromRpcResponse({chain, size_on_disk, difficulty}: BlockchainInfoRPC): ChainStats {
    return new ChainStats(chain, size_on_disk, difficulty);
  }

  static fromRow(row?: ChainStatsRow): ChainStats {
    if (row == null) {
      return new ChainStats();
    }

    const latestHeight = row.latest_height != null ? Number(row.latest_height) : undefined;
    const mempoolSize = row.mempool_size != null ? Number(row.mempool_size) : undefined;

    const lastTs = row.last_timestamp != null ? new Date(row.last_timestamp).getTime() : null;
    const firstTs = row.first_timestamp != null ? new Date(row.first_timestamp).getTime() : null;
    const btFirstTs = row.bt_first_timestamp != null ? new Date(row.bt_first_timestamp).getTime() : null;

    const btSampleSize = row.bt_sample_size != null ? Number(row.bt_sample_size) : 0;
    const btTimeSpanMSec = lastTs != null && btFirstTs != null ? lastTs - btFirstTs : 0;
    const btTimeSpanSec = btTimeSpanMSec / 1000;

    const blockTime = btSampleSize > 1 ? Math.floor(btTimeSpanMSec / (btSampleSize - 1)) : undefined;

    const txCount = row.bt_tx_count != null ? Number(row.bt_tx_count) : 0;
    const transactionsPerSecond = btTimeSpanSec > 0 ? Number((txCount / btTimeSpanSec).toFixed(2)) : undefined;
    const transactionsPerMinute = btTimeSpanSec > 0 ? Number((txCount / (btTimeSpanSec / 60)).toFixed(2)) : undefined;

    const hrTimeSpanMs = lastTs != null && firstTs != null ? BigInt(lastTs - firstTs) : 0n;
    const difficultySum = row.work_sum != null ? Number(row.work_sum) : 0;
    const hashRate = hrTimeSpanMs > 0n && difficultySum > 0
      ? ((BigInt(Math.floor(difficultySum)) * (1n << 32n) * 1000n) / hrTimeSpanMs).toString()
      : undefined;

    return new ChainStats(
      undefined,
      undefined,
      undefined,
      blockTime,
      transactionsPerSecond,
      transactionsPerMinute,
      latestHeight,
      hashRate,
      mempoolSize,
    );
  }

  static fromObject({chain, sizeOnDisk, difficulty, blockTime, transactionsPerSecond, transactionsPerMinute, latestHeight, hashRate, mempoolSize}: ChainStatsObject): ChainStats {
    return new ChainStats(chain, sizeOnDisk, difficulty, blockTime, transactionsPerSecond, transactionsPerMinute, latestHeight, hashRate, mempoolSize);
  }
}