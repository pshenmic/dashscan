import {UtxoInfoRPC} from "../dashcoreRPC";

export default class UtxoSummary {
  height: number | null;
  blockHash: string | null;
  outputCount: number | null;
  totalAmountDuffs: string | null;

  constructor(height?: number, blockHash?: string, outputCount?: number, totalAmountDuffs?: string) {
    this.height = height ?? null;
    this.blockHash = blockHash ?? null;
    this.outputCount = outputCount ?? null;
    this.totalAmountDuffs = totalAmountDuffs ?? null;
  }

  // rpc returns total_amount in dash
  static fromRPC({height, bestblock, txouts, total_amount}: UtxoInfoRPC): UtxoSummary {
    return new UtxoSummary(height, bestblock, txouts, BigInt(Math.round(total_amount * 1e8)).toString());
  }
}
