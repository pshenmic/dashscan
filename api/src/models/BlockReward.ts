import {BlockStatsRPC, MasternodePaymentsRPC} from "../dashcoreRPC";
import {Coinbase} from "../types/block";

export default class BlockReward {
  height: number | null;
  subsidy: number | null;
  fees: number | null;
  miner: number | null;
  masternode: number | null;
  platform: number | null;
  treasury: number | null;

  constructor(height?: number, subsidy?: number, fees?: number, miner?: number, masternode?: number, platform?: number, treasury?: number) {
    this.height = height ?? null;
    this.subsidy = subsidy ?? null;
    this.fees = fees ?? null;
    this.miner = miner ?? null;
    this.masternode = masternode ?? null;
    this.platform = platform ?? null;
    this.treasury = treasury ?? null;
  }

  static fromRPC({height, subsidy, totalfee}: BlockStatsRPC, payments: MasternodePaymentsRPC | undefined, {total, superblock}: Coinbase): BlockReward {
    const masternodes = payments?.masternodes ?? [];
    const masternode = masternodes.reduce((acc, mn) => acc + mn.amount, 0);
    const platform = masternodes
      .flatMap((mn) => mn.payees)
      .filter((payee) => payee.script === '6a')
      .reduce((acc, payee) => acc + payee.amount, 0);

    return new BlockReward(height, subsidy, totalfee, subsidy + totalfee - masternode, masternode, platform, superblock ? Math.max(total - subsidy - totalfee, 0) : 0);
  }
}
