import {GeoIpInfo} from "../services/GeoIPService";

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

interface MasternodeObject {
  proTxHash?: string | null;
  address?: string | null;
  payee?: string | null;
  status?: string | null;
  type?: string | null;
  posPenaltyScore?: number | null;
  consecutivePayments?: number | null;
  lastPaidTime?: Date | null;
  lastPaidBlock?: number | null;
  ownerAddress?: string | null;
  votingAddress?: string | null;
  collateralAddress?: string | null;
  pubKeyOperator?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  geoIpInfo?: GeoIpInfo | null;
}

export default class Masternode {
  proTxHash: string | null;
  address: string | null;
  payee: string | null;
  status: string | null;
  type: string | null;
  posPenaltyScore: number | null;
  consecutivePayments: number | null;
  lastPaidTime: Date | null;
  lastPaidBlock: number | null;
  ownerAddress: string | null;
  votingAddress: string | null;
  collateralAddress: string | null;
  pubKeyOperator: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  geoIpInfo: GeoIpInfo | null;

  constructor(
    proTxHash?: string,
    address?: string,
    payee?: string,
    status?: string,
    type?: string,
    posPenaltyScore?: number,
    consecutivePayments?: number,
    lastPaidTime?: Date,
    lastPaidBlock?: number,
    ownerAddress?: string,
    votingAddress?: string,
    collateralAddress?: string,
    pubKeyOperator?: string,
    createdAt?: Date,
    updatedAt?: Date,
    geoIpInfo?: GeoIpInfo,
  ) {
    this.proTxHash = proTxHash ?? null;
    this.payee = payee ?? null;
    this.status = status ?? null;
    this.type = type ?? null;
    this.ownerAddress = ownerAddress ?? null;
    this.votingAddress = votingAddress ?? null;
    this.collateralAddress = collateralAddress ?? null;
    this.createdAt = createdAt ?? null;
    this.geoIpInfo = geoIpInfo ?? null;
    // without default for short form (masternodes map)
    this.address = address;
    this.posPenaltyScore = posPenaltyScore;
    this.consecutivePayments = consecutivePayments;
    this.lastPaidTime = lastPaidTime;
    this.lastPaidBlock = lastPaidBlock;
    this.pubKeyOperator = pubKeyOperator;
    this.updatedAt = updatedAt;
  }

  static fromRPC(entry: MasternodeRPCEntry): Masternode {
    const lastPaidDate = new Date(entry.lastpaidtime ?? 0);

    return new Masternode(
      entry.proTxHash,
      entry.address,
      entry.payee,
      entry.status,
      entry.type,
      entry.pospenaltyscore,
      entry.consecutivePayments,
      lastPaidDate,
      entry.lastpaidblock,
      entry.owneraddress,
      entry.votingaddress,
      entry.collateraladdress,
      entry.pubkeyoperator,
    );
  }

  static fromRow(row: MasternodeRow): Masternode {
    const lastPaidDate = new Date(Number(row.last_paid_time??0) * 1000)

    return new Masternode(
      row.pro_tx_hash,
      row.address,
      row.payee,
      row.status,
      row.type,
      row.pos_penalty_score,
      row.consecutive_payments,
      lastPaidDate,
      row.last_paid_block,
      row.owner_address,
      row.voting_address,
      row.collateral_address,
      row.pub_key_operator,
      row.created_at,
      row.updated_at,
    );
  }

  static fromObject({
                      proTxHash,
                      address,
                      payee,
                      status,
                      type,
                      posPenaltyScore,
                      consecutivePayments,
                      lastPaidTime,
                      lastPaidBlock,
                      ownerAddress,
                      votingAddress,
                      collateralAddress,
                      pubKeyOperator,
                      createdAt,
                      updatedAt,
                      geoIpInfo
                    }: MasternodeObject): Masternode {
    return new Masternode(proTxHash, address, payee, status, type, posPenaltyScore, consecutivePayments, lastPaidTime, lastPaidBlock, ownerAddress, votingAddress, collateralAddress, pubKeyOperator, createdAt, updatedAt, geoIpInfo)
  }
}