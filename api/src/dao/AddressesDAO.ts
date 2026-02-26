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
      .select('address', 'creation_height')
      .select(this.knex('addresses').count('id').as('total_count'))
      .orderBy('creation_height', order)
      .offset(fromRank)
      .limit(limit);

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Address.fromRow), page, limit, row?.total_count);
  };
}
