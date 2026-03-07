interface MasternodeRPCEntry {
  proTxHash: string;
  address: string;
  payee: string;
  status: string;
  type: string;
  pospenaltyscore: number;
  consecutivePayments: number;
  lastpaidtime: number;
  lastpaidblock: number;
  owneraddress: string;
  votingaddress: string;
  collateraladdress: string;
  pubkeyoperator: string;
}

interface MasternodeRow {
  pro_tx_hash: string;
  address: string;
  payee: string;
  status: string;
  type: string;
  pos_penalty_score: number;
  consecutive_payments: number;
  last_paid_time: number;
  last_paid_block: number;
  owner_address: string;
  voting_address: string;
  collateral_address: string;
  pub_key_operator: string;
  created_at: Date;
  updated_at: Date;
}

export default class Masternode {
  proTxHash: string | null;
  address: string | null;
  payee: string | null;
  status: string | null;
  type: string | null;
  posPenaltyScore: number | null;
  consecutivePayments: number | null;
  lastPaidTime: number | null;
  lastPaidBlock: number | null;
  ownerAddress: string | null;
  votingAddress: string | null;
  collateralAddress: string | null;
  pubKeyOperator: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;

  constructor(
    proTxHash?: string,
    address?: string,
    payee?: string,
    status?: string,
    type?: string,
    posPenaltyScore?: number,
    consecutivePayments?: number,
    lastPaidTime?: number,
    lastPaidBlock?: number,
    ownerAddress?: string,
    votingAddress?: string,
    collateralAddress?: string,
    pubKeyOperator?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.proTxHash = proTxHash ?? null;
    this.address = address ?? null;
    this.payee = payee ?? null;
    this.status = status ?? null;
    this.type = type ?? null;
    this.posPenaltyScore = posPenaltyScore ?? null;
    this.consecutivePayments = consecutivePayments ?? null;
    this.lastPaidTime = lastPaidTime ?? null;
    this.lastPaidBlock = lastPaidBlock ?? null;
    this.ownerAddress = ownerAddress ?? null;
    this.votingAddress = votingAddress ?? null;
    this.collateralAddress = collateralAddress ?? null;
    this.pubKeyOperator = pubKeyOperator ?? null;
    this.createdAt = createdAt ?? null;
    this.updatedAt = updatedAt ?? null;
  }

  static fromRPC(entry: MasternodeRPCEntry): Masternode {
    return new Masternode(
      entry.proTxHash,
      entry.address,
      entry.payee,
      entry.status,
      entry.type,
      entry.pospenaltyscore,
      entry.consecutivePayments,
      entry.lastpaidtime,
      entry.lastpaidblock,
      entry.owneraddress,
      entry.votingaddress,
      entry.collateraladdress,
      entry.pubkeyoperator,
    );
  }

  static fromRow(row: MasternodeRow): Masternode {
    return new Masternode(
      row.pro_tx_hash,
      row.address,
      row.payee,
      row.status,
      row.type,
      row.pos_penalty_score,
      row.consecutive_payments,
      row.last_paid_time,
      row.last_paid_block,
      row.owner_address,
      row.voting_address,
      row.collateral_address,
      row.pub_key_operator,
      row.created_at,
      row.updated_at,
    );
  }
}