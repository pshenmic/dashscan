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

    const rows = await this.knex('addresses')
      .select('address', 'first_seen_block', 'first_seen_tx', 'last_seen_block', 'last_seen_tx')
      .select(this.knex('addresses').count('address').as('total_count'))
      .orderBy('last_seen_block', order)
      .offset(fromRank)
      .limit(limit);

    const [row] = rows;

    return new PaginatedResultSet(rows.map(row => Address.fromRow(row)), page, limit, row?.total_count);
  };
}
