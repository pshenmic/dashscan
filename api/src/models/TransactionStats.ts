interface TransactionStatsRow {
  total?: string | number | null;
  special?: string | number | null;
  coinjoin?: string | number | null;
  multisig?: string | number | null;
  normal?: string | number | null;
  fees?: string | number | null;
  fee_tx_count?: string | number | null;
  coinjoin_amount?: string | number | null;
}

export default class TransactionStats {
  total: number | null;
  special: number | null;
  coinjoin: number | null;
  multisig: number | null;
  normal: number | null;
  fees: number | null;
  averageFee: number | null;
  coinjoinAmount: number | null;

  constructor(total?: number, special?: number, coinjoin?: number, multisig?: number, normal?: number, fees?: number, averageFee?: number, coinjoinAmount?: number) {
    this.total = total ?? null;
    this.special = special ?? null;
    this.coinjoin = coinjoin ?? null;
    this.multisig = multisig ?? null;
    this.normal = normal ?? null;
    this.fees = fees ?? null;
    this.averageFee = averageFee ?? null;
    this.coinjoinAmount = coinjoinAmount ?? null;
  }

  // categories overlap, so total is not their sum
  static fromRow({total, special, coinjoin, normal, multisig, fees, fee_tx_count, coinjoin_amount}: TransactionStatsRow): TransactionStats {
    const totalCount = Number(total) || 0
    const specialTxsCount = Number(special) || 0
    const coinjoinTxsCount = Number(coinjoin) || 0
    const multisigTxsCount = Number(multisig) || 0
    const normalTxsCount = Number(normal) || 0
    const feesSum = Number(fees) || 0
    const feeTxsCount = Number(fee_tx_count) || 0
    const averageFee = feeTxsCount > 0 ? Math.round(feesSum / feeTxsCount) : undefined

    return new TransactionStats(totalCount, specialTxsCount, coinjoinTxsCount, multisigTxsCount, normalTxsCount, feesSum, averageFee, Number(coinjoin_amount) || 0);
  }
}