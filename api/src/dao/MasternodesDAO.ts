import { Knex } from 'knex';
import Masternode from '../models/Masternode';

export default class MasternodesDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getMasternodes = async (): Promise<Masternode[]> => {
    const rows = await this.knex('masternodes').select(
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
    );

    return rows.map(row => Masternode.fromRow(row));
  };
}