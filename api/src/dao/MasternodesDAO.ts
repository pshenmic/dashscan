import { Knex } from 'knex';
import Masternode from '../models/Masternode';
import PaginatedResultSet from '../models/PaginatedResultSet';

export default class MasternodesDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getMasternodes = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Masternode>> => {
    const fromRank = (page - 1) * limit;

    const rows = await this.knex('masternodes')
      .select(
        'pro_tx_hash',
        'address',
        'payee',
        'status',
        'type',
        'pos_penalty_score',
        'consecutive_payments',
        'last_paid_time',
        'last_paid_block',
        'owner_address',
        'voting_address',
        'collateral_address',
        'pub_key_operator',
        'created_at',
        'updated_at',
      )
      .select(this.knex('masternodes').count('pro_tx_hash').as('total_count'))
      .orderBy('last_paid_block', order)
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    return new PaginatedResultSet(rows.map(row => Masternode.fromRow(row)), page, limit, row?.total_count);
  };
}