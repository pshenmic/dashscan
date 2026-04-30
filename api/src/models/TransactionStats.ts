interface TransactionStatsRow {
  special?: string | number | null;
  coinjoin?: string | number | null;
  multisig?: string | number | null;
  normal?: string | number | null;
}

export default class TransactionStats {
  total: number | null;
  special: number | null;
  coinjoin: number | null;
  multisig: number | null;
  normal: number | null;

  constructor(total?: number, special?: number, coinjoin?: number, multisig?: number, normal?: number) {
    this.total = total ?? null;
    this.special = special ?? null;
    this.coinjoin = coinjoin ?? null;
    this.multisig = multisig ?? null;
    this.normal = normal ?? null;
  }

  static fromRow({special, coinjoin, normal, multisig}: TransactionStatsRow): TransactionStats {
    const specialTxsCount = Number(special) || 0
    const coinjoinTxsCount = Number(coinjoin) || 0
    const multisigTxsCount = Number(multisig) || 0
    const normalTxsCount = Number(normal) || 0
    const totalCount = specialTxsCount + coinjoinTxsCount + multisigTxsCount + normalTxsCount

    return new TransactionStats(totalCount, specialTxsCount, coinjoinTxsCount, multisigTxsCount, normalTxsCount);
  }
}