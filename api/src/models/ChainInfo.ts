import {BlockchainInfoRPC} from "../dashcoreRPC";

export default class ChainInfo {
  chain: string | null;
  sizeOnDisk: number | null;
  difficulty: number | null;

  constructor(chain: string, sizeOnDisk: number, difficulty: number) {
    this.chain = chain ?? null;
    this.sizeOnDisk = sizeOnDisk ?? null;
    this.difficulty = difficulty ?? null;
  }

  static fromRpcResponse({chain, size_on_disk, difficulty}: BlockchainInfoRPC): ChainInfo {
    return new ChainInfo(chain, size_on_disk, difficulty);
  }
}