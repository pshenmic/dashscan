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
  nonce: number;
}

export interface ApiVIn {
  txId: string;
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
}

export interface ApiAddress {
  address: string;
  firstSeenBlock: number;
  firstSeenTx: string;
  lastSeenBlock: number;
  lastSeenTx: string;
}
