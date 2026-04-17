export interface PaginationParams {
  page?: number;
  limit?: number;
  order?: "asc" | "desc";
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  resultSet: T[];
  pagination: PaginationResult;
}

export interface ApiBlock {
  height: number;
  hash: string;
  version: number;
  timestamp: string;
  txCount: number;
  size: number;
  creditPoolBalance: number;
  difficulty: number;
  merkleRoot: string;
  previousBlockHash: string;
  confirmations: number;
  nonce: number;
}

export interface ApiVIn {
  txId: string | null;
  vOut: number;
  sequence: number;
  scriptSigASM: string;
}

export interface ApiVOut {
  value: string;
  number: number;
  scriptPubKeyASM: string;
}

export interface ApiTransaction {
  hash: string;
  type: number;
  blockHeight: number;
  blockHash: string;
  amount: number;
  version: number;
  vIn: ApiVIn[];
  vOut: ApiVOut[];
  confirmations: number;
  instantLock: boolean;
  timestamp: string;
}

export interface ApiAddress {
  address: string;
  firstSeenBlock: number;
  firstSeenTx: string;
  lastSeenBlock: number;
  lastSeenTx: string;
}

export interface ApiMasternode {
  proTxHash: string;
  address: string;
  payee: string;
  status: string;
  type: string;
  posPenaltyScore: number;
  consecutivePayments: number;
  lastPaidTime: number;
  lastPaidBlock: number;
  ownerAddress: string;
  votingAddress: string;
  collateralAddress: string;
  pubKeyOperator: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTransactionHistoryEntry {
  timestamp: number;
  count: number;
}

export interface ApiHistoricalEntry {
  timestamp: number;
  value: number;
}

export interface SearchResponse {
  block: ApiBlock | null;
  transaction: ApiTransaction | null;
  masternode: ApiMasternode | null;
  address: ApiAddress | null;
}

export interface ApiProposalData {
  endEpoch: number | null;
  startEpoch: number | null;
  name: string | null;
  paymentAddress: string | null;
  paymentAmount: number | null;
  type: number | null;
  url: string | null;
}

export interface ApiGovernanceObject {
  dataHex: string | null;
  data: ApiProposalData | null;
  hash: string | null;
  collateralHash: string | null;
  objectType: "Unknown" | "Proposal" | "Trigger" | null;
  creationTime: string | null;
  signingMasternode?: string | null;
  absoluteYesCount: number | null;
  yesCount: number | null;
  noCount: number | null;
  abstainCount: number | null;
  localValidity: boolean | null;
  isValidReason: string | null;
}
