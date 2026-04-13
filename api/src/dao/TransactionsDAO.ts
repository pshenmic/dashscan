import {Knex} from 'knex';
import Transaction from '../models/Transaction';
import VIn from '../models/VIn';
import VOut from '../models/VOut';
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

    const outputsSubquery = this.knex('tx_outputs')
      .whereRaw('tx_outputs.tx_id = subquery.id')
      .select(this.knex.raw('json_agg(tx_outputs.*) as outputs'));

    const inputsSubquery = this.knex('tx_inputs')
      .leftJoin('addresses', 'addresses.id', 'tx_inputs.address_id')
      .whereRaw('tx_inputs.tx_id = subquery.id')
      .select(this.knex.raw(`
        json_agg(
          json_build_object(
            'prev_tx_hash', tx_inputs.prev_tx_hash,
            'prev_vout_index', tx_inputs.prev_vout_index,
            'address', addresses.address,
            'address_id', tx_inputs.address_id
          )
        ) as inputs
      `));

    const rows = await this.knex
      .with('subquery', subquery)
      .with('total_count', countSubquery)
      .select(this.knex.raw('max_height - block_height + 1 AS confirmations'))
      .select(this.knex('total_count').as('total_count'))
      .select(
        'subquery.hash', 'type', 'block_height',
        'blocks.timestamp as timestamp', 'chain_locked',
        'blocks.hash as block_hash', 'instant_lock',
        'inputs.inputs', 'outputs.outputs'
      )
      .leftJoin(this.knex.raw(`
        LATERAL (
          ${outputsSubquery.toQuery()}
        ) outputs ON true
      `))
      .leftJoin(
        this.knex.raw(`
          LATERAL (
            ${inputsSubquery.toQuery()}
          ) inputs ON true
        `)
      )
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'block_height')
      .from('subquery')

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count);
  };

  getTransactionByHash = async (hash: string): Promise<Transaction | null> => {
    const blockMaxHeightSubquery = this.knex('blocks')
      .select(this.knex.raw('MAX(height) as max_height'))
      .as('height_subquery')

    const row = await this.knex('transactions')
      .select(
        'transactions.id',
        'transactions.hash',
        'transactions.type',
        'transactions.version',
        'transactions.size',
        'blocks.hash as block_hash',
        'transactions.locktime',
        'transactions.is_coinbase',
        'blocks.timestamp as timestamp',
        'block_height',
        'instant_lock',
        'chain_locked',
      )
      .select(this.knex.raw('max_height - block_height + 1 AS confirmations'))
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'transactions.block_height')
      .where('transactions.hash', hash.trim())
      .first();

    if (!row) return null;

    const inputRows = await this.knex('tx_inputs')
      .where('tx_id', row.id)
      .orderBy('vin_index');

    const outputRows = await this.knex('tx_outputs')
      .where('tx_id', row.id)
      .orderBy('vout_index');

    const vIn = inputRows.map(({prev_tx_hash, prev_vout_index}: { prev_tx_hash: string; prev_vout_index: number }) =>
      VIn.fromObject({prevTxHash: prev_tx_hash?.trim(), vOutIndex: prev_vout_index}),
    );

    const vOut = outputRows.map(({value, vout_index, script_pub_key}: {
        value: bigint;
        vout_index: number;
        script_pub_key: string
      }) =>
        VOut.fromObject({value: value?.toString(), number: vout_index, scriptPubKeyASM: script_pub_key}),
    );

    const tx = Transaction.fromRow(row);

    return Transaction.fromObject({
      ...tx,
      vIn,
      vOut
    })
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

    const rows = await this.knex('transactions')
      .select('transactions.hash')
      .select(
        this.knex('blocks')
          .select('tx_count')
          .where('height', height)
          .as('total_count')
      )
      .leftJoin('blocks', 'blocks.height', 'transactions.block_height')
      .where('blocks.height', height)
      .orderBy('transactions.id', order)
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    const transactions = await Promise.all(rows.map(({hash}: { hash: string }) => this.getTransactionByHash(hash)));

    return new PaginatedResultSet(transactions as Transaction[], page, limit, row?.total_count);
  };

  getPendingTransactions = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const subquery = this.knex('transactions')
      .select(
        'transactions.hash', 'instant_lock', 'chain_locked',
      )
      .whereNull('block_height')
      .orderBy('id', order);

    const countedSubquery = this.knex
      .with('subquery', subquery)
      .select('hash', 'instant_lock', 'chain_locked')
      .select(this.knex('subquery').count('*').as('total_count'))
      .limit(limit)
      .offset(fromRank)
      .from('subquery');

    const rows = await this.knex
      .with('subquery', countedSubquery)
      .select(
        'subquery.hash', 'total_count', 'instant_lock', 'chain_locked'
      )
      .from('subquery')

    const [row] = rows;

    const transactions = rows.map(Transaction.fromRow)

    return new PaginatedResultSet(transactions, Number(page), limit, row?.total_count ?? -1);
  }
}
