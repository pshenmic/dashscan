import {Knex} from 'knex';
import Transaction from '../models/Transaction';
import TransactionStats from '../models/TransactionStats';
import PaginatedResultSet from '../models/PaginatedResultSet';
import SeriesData from '../models/SeriesData';
import {TransactionType} from "../enums/TransactionType";

export default class TransactionsDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getTransactions = async (page: number, limit: number, order: string, transactionType?: TransactionType, coinjoin?: boolean, multisig?: boolean, blockHeight?: number): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const filtered = transactionType != null || coinjoin != null || multisig != null || blockHeight != null;

    // TODO: Slow on pages like 10000000, maybe we need to add cursor
    //  or something what can improve performance
    const countSubquery = filtered
      ? this.knex('transactions')
          .count('* as reltuples')
          .modify((builder) => {
            if (transactionType != null) builder.where('type', transactionType);
            if (coinjoin != null) builder.where('coinjoin', coinjoin);
            if (multisig != null) builder.where('multisig', multisig);
            if (blockHeight != null) builder.where('block_height', blockHeight);
          })
      : this.knex('pg_class')
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
        'transactions.id',
        'transactions.version',
        this.knex.raw('transactions.amount::text as amount'),
        'transactions.coinjoin',
        'transactions.multisig',
        'transactions.size'
      )
      .modify((builder) => {
        if (transactionType != null) builder.where('transactions.type', transactionType);
        if (coinjoin != null) builder.where('transactions.coinjoin', coinjoin);
        if (multisig != null) builder.where('transactions.multisig', multisig);
        if (blockHeight != null) builder.where('transactions.block_height', blockHeight);
      })
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
        'blocks.hash as block_hash', 'instant_lock', 'subquery.size',
        'agg_inputs.inputs', 'agg_outputs.outputs', 'subquery.version',
        'subquery.amount', 'subquery.coinjoin', 'subquery.multisig'
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
        this.knex.raw('subquery.amount::text as amount'),
        'subquery.coinjoin',
        'subquery.multisig',
        'special_transactions.payload as extra_payload',
        'blocks.hash as block_hash',
        'blocks.timestamp as timestamp',
      )
      .select(this.knex.raw('max_height - block_height + 1 AS confirmations'))
      .select('agg_inputs.inputs', 'agg_outputs.outputs')
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'subquery.block_height')
      .leftJoin('special_transactions', 'special_transactions.tx_id', 'subquery.id')
      .first()
      .from('subquery');

    if (!row) return null;

    return Transaction.fromRow(row);
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
        'transactions.id',
        'transactions.version',
        'transactions.size',
        this.knex.raw('transactions.amount::text as amount'),
        'transactions.coinjoin',
        'transactions.multisig',
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
        'blocks.hash as block_hash', 'instant_lock', 'subquery.size',
        'special_transactions.payload as extra_payload',
        'agg_inputs.inputs', 'agg_outputs.outputs', 'subquery.version',
        'subquery.amount', 'subquery.coinjoin', 'subquery.multisig'
      )
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'block_height')
      .leftJoin('special_transactions', 'special_transactions.tx_id', 'subquery.id')
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
        'transactions.id',
        'transactions.version',
        'transactions.size',
        this.knex.raw('transactions.amount::text as amount'),
        'transactions.coinjoin',
        'transactions.multisig'
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
        'subquery.hash', 'type', 'chain_locked', 'instant_lock','subquery.size',
        'agg_inputs.inputs', 'agg_outputs.outputs', 'subquery.version',
        'subquery.amount', 'subquery.coinjoin', 'subquery.multisig'
      )
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .from('subquery')

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count ?? -1);
  }

  getTransactionCountSeries = async (start: Date, end: Date, interval: string, intervalInMs: number, runningTotal: boolean): Promise<SeriesData[]> => {
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

    // Use blocks.tx_count directly — avoids touching the transactions table entirely.
    // The block_timestamp index covers the range scan; tx_count is in the same row.
    const bucketsCTE = this.knex('ranges')
      .select('date_from')
      .select(this.knex.raw('COALESCE(SUM(blocks.tx_count), 0)::bigint AS count'))
      .leftJoin('blocks', function () {
        this.on('blocks.timestamp', '>', 'ranges.date_from')
          .andOn('blocks.timestamp', '<=', 'ranges.date_to');
      })
      .groupBy('date_from');

    const countSelect = runningTotal
      ? this.knex.raw('SUM(count) OVER (ORDER BY date_from ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS value')
      : this.knex.raw('count AS value');

    const rows = await this.knex
      .with('ranges', ranges)
      .with('buckets', bucketsCTE)
      .select('date_from')
      .select(countSelect)
      .from('buckets')
      .orderBy('date_from', 'asc');

    return rows.map((row: any) => new SeriesData(
      new Date(row.date_from),
      { count: row.value !== null ? Number(row.value) : 0 },
    ));
  }

  getAddressTransactions = async (address: string, page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const addressIdSubquery = this.knex('addresses').select('id').where('address', address);

    const addressTxIdsCTE = this.knex('tx_outputs')
      .select('tx_id')
      .where('address_id', addressIdSubquery)
      .union(
        this.knex('tx_inputs')
          .select('tx_id')
          .where('address_id', addressIdSubquery),
      );

    const countSubquery = this.knex('address_tx_ids').count('*');

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
        'transactions.version',
        'transactions.size',
        'transactions.id',
        this.knex.raw('transactions.amount::text as amount'),
        'transactions.coinjoin',
        'transactions.multisig',
      )
      .whereIn('transactions.id', this.knex('address_tx_ids').select('tx_id'))
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
      .with('address_tx_ids', addressTxIdsCTE)
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
        'agg_inputs.inputs', 'agg_outputs.outputs', 'subquery.version',
        'subquery.amount', 'subquery.coinjoin', 'subquery.multisig',
        'special_transactions.payload as extra_payload', 'subquery.size'
      )
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .leftJoin('special_transactions', 'special_transactions.tx_id', 'subquery.id')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'block_height')
      .orderBy('subquery.id', order)
      .from('subquery')

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count ?? -1);
  }

  getMasternodeTransactions = async (proTxHash: string, page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const masternodeAddressIdsCTE = this.knex('addresses')
      .join('masternodes', function () {
        this.on('addresses.address', '=', 'masternodes.payee')
          .orOn('addresses.address', '=', 'masternodes.owner_address')
          .orOn('addresses.address', '=', 'masternodes.voting_address')
          .orOn('addresses.address', '=', 'masternodes.collateral_address');
      })
      .where('masternodes.pro_tx_hash', proTxHash)
      .select('addresses.id');

    const addressTxIdsCTE = this.knex('tx_outputs')
      .select('tx_id')
      .whereIn('address_id', this.knex('masternode_address_ids').select('id'))
      .union(
        this.knex('tx_inputs')
          .select('tx_id')
          .whereIn('address_id', this.knex('masternode_address_ids').select('id')),
      );

    const countSubquery = this.knex('address_tx_ids').count('*');

    const blockMaxHeightSubquery = this.knex('blocks')
      .select(this.knex.raw('MAX(height) as max_height'))
      .as('height_subquery');

    const subquery = this.knex('transactions')
      .select(
        'transactions.hash',
        'transactions.type',
        'transactions.block_height',
        'transactions.chain_locked',
        'transactions.instant_lock',
        'transactions.version',
        'transactions.size',
        'transactions.id',
        this.knex.raw('transactions.amount::text as amount'),
        'transactions.coinjoin',
        'transactions.multisig',
      )
      .whereIn('transactions.id', this.knex('address_tx_ids').select('tx_id'))
      .orderBy('transactions.block_height', order)
      .limit(limit)
      .offset(fromRank);

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
      .with('masternode_address_ids', masternodeAddressIdsCTE)
      .with('address_tx_ids', addressTxIdsCTE)
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
        'agg_inputs.inputs', 'agg_outputs.outputs', 'subquery.version',
        'subquery.amount', 'subquery.coinjoin', 'subquery.multisig',
        'special_transactions.payload as extra_payload', 'subquery.size',
      )
      .leftJoin('agg_outputs', 'agg_outputs.tx_id', 'subquery.id')
      .leftJoin('agg_inputs', 'agg_inputs.tx_id', 'subquery.id')
      .leftJoin('special_transactions', 'special_transactions.tx_id', 'subquery.id')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))
      .leftJoin('blocks', 'blocks.height', 'block_height')
      .orderBy('subquery.id', order)
      .from('subquery');

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count ?? -1);
  }

  getTransactionStats24h = async (): Promise<TransactionStats | null> => {
    const minHeightSubquery = this.knex('blocks')
      .min('height')
      .where('timestamp', '>', this.knex.raw("NOW() - INTERVAL '24 hours'"));

    const [row] = await this.knex
      .select(
        this.knex.raw('COUNT(*) FILTER (WHERE type > 0)::bigint AS special'),
        this.knex.raw('COUNT(*) FILTER (WHERE coinjoin)::bigint AS coinjoin'),
        this.knex.raw('COUNT(*) FILTER (WHERE multisig)::bigint AS multisig'),
        this.knex.raw('COUNT(*) FILTER (WHERE type = 0 AND NOT coinjoin AND NOT multisig)::bigint AS normal')
      )
      .where('block_height', '>=', minHeightSubquery)
      .limit(1)
      .from('transactions');

    if (row == null) {
      return null;
    }

    return TransactionStats.fromRow(row);
  }
}
