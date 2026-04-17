import {Knex} from 'knex';
import Transaction from '../models/Transaction';
import PaginatedResultSet from '../models/PaginatedResultSet';
import {DashCoreRPC} from "../dashcoreRPC";

export default class TransactionsDAO {
  private knex: Knex;
  private dashCoreRPC: DashCoreRPC;

  constructor(knex: Knex, dashCoreRPC: DashCoreRPC) {
    this.knex = knex;
    this.dashCoreRPC = dashCoreRPC;
  }

  getTransactions = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    // TODO: Slow on pages like 10000000, maybe we need to add cursor
    //  or something what can improve performance
    const countSubquery = this.knex('pg_class')
      .select(this.knex.raw('reltuples::bigint'))
      .whereRaw(`relname='transactions'`)
      .limit(1)

    const blockMaxHeightSubquery = this.knex('blocks')
      .select(this.knex.raw('MAX(height) as max_height'))
      .as('height_subquery')

    const subquery = this.knex('transactions')
      .select(
        'transactions.hash',
        'transactions.type',
        'transactions.block_height',
        'transactions.chain_locked',
        'transactions.instant_lock',
        'transactions.id'
      )
      .orderBy('transactions.block_height', order)
      .limit(limit)
      .offset(fromRank)

    const outputsCTE = this.knex('tx_outputs')
      .select('tx_id')
      .select(this.knex.raw('json_agg(tx_outputs.*) as outputs'))
      .whereIn('tx_id', this.knex('subquery').select('id'))
      .groupBy('tx_id');

    const inputsCTE = this.knex('tx_inputs')
      .leftJoin('addresses', 'addresses.id', 'tx_inputs.address_id')
      .leftJoin('tx_outputs', function () {
        this.on('tx_outputs.tx_id', '=', 'tx_inputs.prev_tx_id')
          .andOn('tx_outputs.vout_index', '=', 'tx_inputs.prev_vout_index');
      })
      .whereIn('tx_inputs.tx_id', this.knex('subquery').select('id'))
      .select('tx_inputs.tx_id')
      .select(this.knex.raw(`
        json_agg(
          json_build_object(
            'prev_tx_hash', tx_inputs.prev_tx_hash,
            'prev_vout_index', tx_inputs.prev_vout_index,
            'address', addresses.address,
            'amount', tx_outputs.value::text
          )
        ) as inputs
      `))
      .groupBy('tx_inputs.tx_id');

    const rows = await this.knex
      .with('subquery', subquery)
      .with('total_count', countSubquery)
      .with('agg_outputs', outputsCTE)
      .with('agg_inputs', inputsCTE)
      .select(this.knex.raw('max_height - block_height + 1 AS confirmations'))
      .select(this.knex('total_count').as('total_count'))
      .select(
        'subquery.hash', 'type', 'block_height',
        'blocks.timestamp as timestamp', 'chain_locked',
        'blocks.hash as block_hash', 'instant_lock',
        'agg_inputs.inputs', 'agg_outputs.outputs'
      )
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'block_height')
      .from('subquery');


    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count);
  };

  getTransactionByHash = async (hash: string): Promise<Transaction | null> => {
    const blockMaxHeightSubquery = this.knex('blocks')
      .select(this.knex.raw('MAX(height) as max_height'))
      .as('height_subquery')

    const outputsCTE = this.knex('tx_outputs')
      .select('tx_id')
      .select(this.knex.raw('json_agg(tx_outputs.*) as outputs'))
      .whereIn('tx_id', this.knex('subquery').select('id'))
      .groupBy('tx_id');

    const inputsCTE = this.knex('tx_inputs')
      .leftJoin('addresses', 'addresses.id', 'tx_inputs.address_id')
      .leftJoin('tx_outputs', function () {
        this.on('tx_outputs.tx_id', '=', 'tx_inputs.prev_tx_id')
          .andOn('tx_outputs.vout_index', '=', 'tx_inputs.prev_vout_index');
      })
      .whereIn('tx_inputs.tx_id', this.knex('subquery').select('id'))
      .select('tx_inputs.tx_id')
      .select(this.knex.raw(`
        json_agg(
          json_build_object(
            'prev_tx_hash', tx_inputs.prev_tx_hash,
            'prev_vout_index', tx_inputs.prev_vout_index,
            'address', addresses.address,
            'amount', tx_outputs.value::text
          )
        ) as inputs
      `))
      .groupBy('tx_inputs.tx_id');

    const subquery = this.knex('transactions')
      .where('transactions.hash', hash.trim())
      .limit(1)

    const row = await this.knex
      .with('subquery', subquery)
      .with('agg_outputs', outputsCTE)
      .with('agg_inputs', inputsCTE)
      .select(
        'subquery.hash',
        'subquery.type',
        'subquery.version',
        'subquery.size',
        'subquery.locktime',
        'subquery.is_coinbase',
        'subquery.block_height',
        'subquery.instant_lock',
        'subquery.chain_locked',
        'blocks.hash as block_hash',
        'blocks.timestamp as timestamp',
      )
      .select(this.knex.raw('max_height - block_height + 1 AS confirmations'))
      .select('agg_inputs.inputs', 'agg_outputs.outputs')
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'subquery.block_height')
      .first()
      .from('subquery');

    if (!row) return null;

    return Transaction.fromRow(row);
  };

  getTransactionHistory = async (): Promise<{ timestamp: number; count: number }[]> => {
    const rows = await this.knex('transactions')
      .join('blocks', 'blocks.height', 'transactions.block_height')
      .where('blocks.timestamp', '>=', this.knex.raw("NOW() - INTERVAL '24 hours'"))
      .groupByRaw("date_trunc('hour', blocks.timestamp)")
      .orderByRaw("date_trunc('hour', blocks.timestamp) ASC")
      .select(this.knex.raw("date_trunc('hour', blocks.timestamp) as hour"))
      .count('transactions.hash as count');

    return (rows as any[]).map(({hour, count}: { hour: Date; count: string }) => ({
      timestamp: Math.floor(new Date(hour).getTime() / 1000),
      count: Number(count),
    }));
  };

  getTransactionsByBlockHeight = async (height: number, page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const blockMaxHeightSubquery = this.knex('blocks')
      .select(this.knex.raw('MAX(height) as max_height'))
      .as('height_subquery')

    const subquery = this.knex('transactions')
      .select(
        'transactions.hash',
        'transactions.type',
        'transactions.block_height',
        'transactions.chain_locked',
        'transactions.instant_lock',
        'transactions.id'
      )
      .where('transactions.block_height', height)
      .orderBy('transactions.id', order)
      .limit(limit)
      .offset(fromRank)

    const outputsCTE = this.knex('tx_outputs')
      .select('tx_id')
      .select(this.knex.raw('json_agg(tx_outputs.*) as outputs'))
      .whereIn('tx_id', this.knex('subquery').select('id'))
      .groupBy('tx_id');

    const inputsCTE = this.knex('tx_inputs')
      .leftJoin('addresses', 'addresses.id', 'tx_inputs.address_id')
      .leftJoin('tx_outputs', function () {
        this.on('tx_outputs.tx_id', '=', 'tx_inputs.prev_tx_id')
          .andOn('tx_outputs.vout_index', '=', 'tx_inputs.prev_vout_index');
      })
      .whereIn('tx_inputs.tx_id', this.knex('subquery').select('id'))
      .select('tx_inputs.tx_id')
      .select(this.knex.raw(`
        json_agg(
          json_build_object(
            'prev_tx_hash', tx_inputs.prev_tx_hash,
            'prev_vout_index', tx_inputs.prev_vout_index,
            'address', addresses.address,
            'amount', tx_outputs.value::text
          )
        ) as inputs
      `))
      .groupBy('tx_inputs.tx_id');

    const rows = await this.knex
      .with('subquery', subquery)
      .with('agg_outputs', outputsCTE)
      .with('agg_inputs', inputsCTE)
      .select(this.knex.raw('max_height - block_height + 1 AS confirmations'))
      .select(
        this.knex('blocks')
          .select('tx_count')
          .where('height', height)
          .as('total_count')
      )
      .select(
        'subquery.hash', 'type', 'block_height',
        'blocks.timestamp as timestamp', 'chain_locked',
        'blocks.hash as block_hash', 'instant_lock',
        'agg_inputs.inputs', 'agg_outputs.outputs'
      )
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'block_height')
      .from('subquery')

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count);
  };

  getPendingTransactions = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const countSubquery = this.knex('transactions')
      .whereNull('block_height')
      .select(this.knex.raw('COUNT(*)::bigint'))

    const subquery = this.knex('transactions')
      .select(
        'transactions.hash',
        'transactions.type',
        'transactions.chain_locked',
        'transactions.instant_lock',
        'transactions.id'
      )
      .whereNull('block_height')
      .orderBy('id', order)
      .limit(limit)
      .offset(fromRank)

    const outputsCTE = this.knex('tx_outputs')
      .select('tx_id')
      .select(this.knex.raw('json_agg(tx_outputs.*) as outputs'))
      .whereIn('tx_id', this.knex('subquery').select('id'))
      .groupBy('tx_id');

    const inputsCTE = this.knex('tx_inputs')
      .leftJoin('addresses', 'addresses.id', 'tx_inputs.address_id')
      .leftJoin('tx_outputs', function () {
        this.on('tx_outputs.tx_id', '=', 'tx_inputs.prev_tx_id')
          .andOn('tx_outputs.vout_index', '=', 'tx_inputs.prev_vout_index');
      })
      .whereIn('tx_inputs.tx_id', this.knex('subquery').select('id'))
      .select('tx_inputs.tx_id')
      .select(this.knex.raw(`
        json_agg(
          json_build_object(
            'prev_tx_hash', tx_inputs.prev_tx_hash,
            'prev_vout_index', tx_inputs.prev_vout_index,
            'address', addresses.address,
            'amount', tx_outputs.value::text
          )
        ) as inputs
      `))
      .groupBy('tx_inputs.tx_id');

    const rows = await this.knex
      .with('subquery', subquery)
      .with('agg_outputs', outputsCTE)
      .with('agg_inputs', inputsCTE)
      .with('total_count', countSubquery)
      .select(this.knex('total_count').as('total_count'))
      .select(
        'subquery.hash', 'type', 'chain_locked', 'instant_lock',
        'agg_inputs.inputs', 'agg_outputs.outputs'
      )
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .from('subquery')

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count ?? -1);
  }
}
