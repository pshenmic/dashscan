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

  getAddress = async (address: string): Promise<Address | null> => {
    const addressIdSubquery = this.knex('addresses').select('id').where('address', address);

    const addressTxsCTE = this.knex('tx_outputs')
      .select('tx_outputs.tx_id', 'tx_outputs.value', this.knex.raw("'out' as src"))
      .where('tx_outputs.address_id', addressIdSubquery)
      .unionAll(
        this.knex('tx_inputs')
          .join('tx_outputs', function () {
            this.on('tx_outputs.tx_id', '=', 'tx_inputs.prev_tx_id')
              .andOn('tx_outputs.vout_index', '=', 'tx_inputs.prev_vout_index');
          })
          .where('tx_inputs.address_id', addressIdSubquery)
          .select('tx_inputs.tx_id', 'tx_outputs.value', this.knex.raw("'in' as src")),
      );

    const statsCTE = this.knex('address_txs').select(
      this.knex.raw("SUM(value) FILTER (WHERE src = 'out') as received"),
      this.knex.raw("SUM(value) FILTER (WHERE src = 'in') as sent"),
      this.knex.raw('COUNT(DISTINCT tx_id) as tx_count'),
    );

    const [row] = await this.knex('addresses')
      .with('address_txs', addressTxsCTE)
      .with('stats', statsCTE)
      .where('addresses.address', address)
      .leftJoin('transactions as first_tx', 'first_tx.id', 'addresses.first_seen_tx_id')
      .leftJoin('transactions as last_tx', 'last_tx.id', 'addresses.last_seen_tx_id')
      .leftJoin('blocks as first_block', 'first_block.height', 'addresses.first_seen_block')
      .leftJoin('blocks as last_block', 'last_block.height', 'addresses.last_seen_block')
      .crossJoin(this.knex.ref('stats'))
      .select(
        'addresses.address',
        'first_tx.hash as first_seen_tx',
        'last_tx.hash as last_seen_tx',
        'first_block.hash as first_seen_block',
        'last_block.hash as last_seen_block',
        this.knex.raw('COALESCE(stats.received, 0) as received'),
        this.knex.raw('COALESCE(stats.sent, 0) as sent'),
        this.knex.raw('COALESCE(stats.tx_count, 0) as tx_count'),
      );

    if (!row) {
      return null;
    }

    const balance = BigInt(row?.received ?? 0) - BigInt(row?.sent ?? 0)

    const result = Address.fromRow(row)

    return Address.fromObject({
      ...result,
      balance: balance.toString(),
    });
  }
}