import {TransactionType} from "../enums/TransactionType";

export interface PaginatedQuery {
  page?: number;
  limit?: number;
  order?: string
  superblock?: boolean
  transaction_type?: keyof typeof TransactionType
  coinjoin?: boolean
  multisig?: boolean
  block_height?: number
}