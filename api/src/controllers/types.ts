import {TransactionType} from "../enums/TransactionType";

export interface PaginatedQuery {
  page?: number;
  limit?: number;
  order?: string
  order_by?: string
  superblock?: boolean
  transaction_type?: keyof typeof TransactionType
  coinjoin?: boolean
  multisig?: boolean
  block_height?: number
  status?: string
  type?: string
  last_paid_before?: string
  has_penalty?: boolean
  country?: string
  available?: boolean
}