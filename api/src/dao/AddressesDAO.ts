import { Knex } from 'knex';
import Address from '../models/Address';
import PaginatedResultSet from '../models/PaginatedResultSet';

export default class AddressesDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getAddresses = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Address>> => {
    const fromRank = (page - 1) * limit;

    const subquery = this.knex('addresses')
      .select('address', 'first_seen_block', 'first_seen_tx_id', 'last_seen_block', 'last_seen_tx_id')
      .orderBy('last_seen_block', order)
      .offset(fromRank)
      .limit(limit)
      .as('subquery');

    // TODO: Implement more accurate solution
    // we cannot use count() on tables with 100 million rows
    // we can use pg_class to get approximate information about the table
    const countSubquery = this.knex('pg_class')
      .select(this.knex.raw('reltuples::bigint'))
      .whereRaw(`relname='addresses'`)
      .limit(1)

    const rows = await this.knex(subquery)
      .select('address')
      .with('total_count', countSubquery)
      .select(this.knex('total_count').as('total_count'))
      .select(this.knex('transactions').select('hash').whereRaw('id=first_seen_tx_id').as('first_seen_tx'))
      .select(this.knex('transactions').select('hash').whereRaw('id=last_seen_tx_id').as('last_seen_tx'))
      .select(this.knex('blocks').select('hash').whereRaw('height=first_seen_block').as('first_seen_block'))
      .select(this.knex('blocks').select('hash').whereRaw('height=last_seen_block').as('last_seen_block'))

    const [row] = rows;

    return new PaginatedResultSet(rows.map(row => Address.fromRow(row)), page, limit, row?.total_count);
  };
}
