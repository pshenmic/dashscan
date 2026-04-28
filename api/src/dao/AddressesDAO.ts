import {Knex} from 'knex';
import Address from '../models/Address';
import PaginatedResultSet from '../models/PaginatedResultSet';
import SeriesData from '../models/SeriesData';
import VIn from "../models/VIn";

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

  getAddressBalanceSeries = async (address: string, start: Date, end: Date, interval: string, intervalInMs: number): Promise<SeriesData[]> => {
    const addressIdSubquery = this.knex('addresses').select('id').where('address', address);

    const startSql = `'${new Date(start.getTime() + intervalInMs).toISOString()}'::timestamptz`;
    const endSql = `'${new Date(end.getTime()).toISOString()}'::timestamptz`;

    const ranges = this.knex
      .from(this.knex.raw(`generate_series(${startSql}, ${endSql}, '${interval}'::interval) date_to`))
      .select('date_to')
      .select(
        this.knex.raw(
          'LAG(date_to, 1, ?::timestamptz) OVER (ORDER BY date_to ASC) AS date_from',
          [start.toISOString()]
        )
      );

    const allTxsCTE = this.knex('tx_outputs')
      .join('transactions', 'transactions.id', 'tx_outputs.tx_id')
      .join('blocks', 'blocks.height', 'transactions.block_height')
      .where('tx_outputs.address_id', addressIdSubquery)
      .select('blocks.timestamp', this.knex.raw('tx_outputs.value::bigint as value'), this.knex.raw("'received' as direction"))
      .unionAll(
        this.knex('tx_inputs')
          .join('tx_outputs as spent_out', function () {
            this.on('spent_out.tx_id', '=', 'tx_inputs.prev_tx_id')
              .andOn('spent_out.vout_index', '=', 'tx_inputs.prev_vout_index');
          })
          .join('transactions', 'transactions.id', 'tx_inputs.tx_id')
          .join('blocks', 'blocks.height', 'transactions.block_height')
          .where('tx_inputs.address_id', addressIdSubquery)
          .select('blocks.timestamp', this.knex.raw('spent_out.value::bigint as value'), this.knex.raw("'spent' as direction"))
      );

    const initialBalanceCTE = this.knex('all_txs')
      .where('timestamp', '<', start.toISOString())
      .select(
        this.knex.raw("COALESCE(SUM(value) FILTER (WHERE direction = 'received'), 0)::bigint - COALESCE(SUM(value) FILTER (WHERE direction = 'spent'), 0)::bigint AS initial_balance")
      );

    const bucketsCTE = this.knex('ranges')
      .select('date_from')
      .select(
        this.knex.raw(
          "COALESCE(SUM(value) FILTER (WHERE direction = 'received'), 0)::bigint - COALESCE(SUM(value) FILTER (WHERE direction = 'spent'), 0)::bigint AS net_change"
        )
      )
      .leftJoin('all_txs', function () {
        this.on('all_txs.timestamp', '>', 'ranges.date_from')
          .andOn('all_txs.timestamp', '<=', 'ranges.date_to');
      })
      .groupBy('date_from');

    const rows = await this.knex
      .with('all_txs', allTxsCTE)
      .with('ranges', ranges)
      .with('initial_balance', initialBalanceCTE)
      .with('buckets', bucketsCTE)
      .select('date_from')
      .select(
        this.knex.raw(
          '(SELECT initial_balance FROM initial_balance) + SUM(net_change) OVER (ORDER BY date_from ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance'
        )
      )
      .from('buckets')
      .orderBy('date_from', 'asc');

    return rows
      .map((row: any) => {
        const timestamp = new Date(row.date_from);
        const data = {balance: row.balance !== null ? row.balance.toString() : '0'};

        return new SeriesData(timestamp, data)
      })
  }

  getAddressUtxo = async (address: string, page: number, limit: number, order: string): Promise<PaginatedResultSet<VIn>> => {
    const fromRank = (page - 1) * limit;

    const addressIdSubquery = this.knex('addresses').select('id').where('address', address);

    const countSubquery = this.knex('utxo')
      .where('address_id', addressIdSubquery)
      .count('* as total');

    const rows = await this.knex('utxo')
      .with('total_count', countSubquery)
      .leftJoin('transactions', 'transactions.id', 'utxo.tx_id')
      .where('utxo.address_id', addressIdSubquery)
      .select(
        'transactions.hash as prev_tx_hash',
        'utxo.vout_index as prev_vout_index',
        this.knex.raw('utxo.amount::text as amount'),
      )
      .select(this.knex('total_count').select('total').as('total_count'))
      .orderBy('utxo.amount', order)
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    return new PaginatedResultSet(
      rows.map((r: any) => VIn.fromRow({...r, address})),
      page,
      limit,
      row?.total_count ?? -1,
    );
  }
}