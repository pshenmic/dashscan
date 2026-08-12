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

  // spent_by_tx_id / spent_by_vin_index (V30) are written by the indexer when
  // the output is spent, replacing a per-output LATERAL into tx_inputs. The
  // indexer applies the precedence the LATERAL's ORDER BY used to encode: a
  // confirmed spend wins over a mempool one. Only the spender's hash and height
  // still need a join, and that is a primary-key lookup.
  private outputsAggregate = (): Knex.QueryBuilder => this.knex('tx_outputs')
    .leftJoin('addresses', 'addresses.id', 'tx_outputs.address_id')
    .leftJoin('transactions as spend_tx', 'spend_tx.id', 'tx_outputs.spent_by_tx_id')
    .whereIn('tx_outputs.tx_id', this.knex('subquery').select('id'))
    .select('tx_outputs.tx_id')
    .select(this.knex.raw(`
        json_agg(
          json_build_object(
            'value', tx_outputs.value,
            'vout_index', tx_outputs.vout_index,
            'script_pub_key', tx_outputs.script_pub_key,
            'script_type', tx_outputs.script_type,
            'address', addresses.address,
            'spent_tx_id', spend_tx.hash,
            'spent_index', tx_outputs.spent_by_vin_index,
            'spent_height', spend_tx.block_height
          ) ORDER BY tx_outputs.vout_index
        ) as outputs
      `))
    .groupBy('tx_outputs.tx_id');

  // tx_inputs.amount (V29) is the spent output's value, denormalized by the
  // indexer, so this no longer joins back to tx_outputs to read it.
  private inputsAggregate = (): Knex.QueryBuilder => this.knex('tx_inputs')
    .leftJoin('addresses', 'addresses.id', 'tx_inputs.address_id')
    .whereIn('tx_inputs.tx_id', this.knex('subquery').select('id'))
    .select('tx_inputs.tx_id')
    .select(this.knex.raw(`
        json_agg(
          json_build_object(
            'prev_tx_hash', tx_inputs.prev_tx_hash,
            'prev_vout_index', tx_inputs.prev_vout_index,
            'address', addresses.address,
            'amount', tx_inputs.amount::text
          ) ORDER BY tx_inputs.vin_index
        ) as inputs
      `))
    .groupBy('tx_inputs.tx_id');

  getTransactions = async (page: number, limit: number, order: string, transactionType?: TransactionType, coinjoin?: boolean, multisig?: boolean, blockHeight?: number): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const filtered = transactionType != null || coinjoin != null || multisig != null || blockHeight != null;

    // TODO: Slow on pages like 10000000, maybe we need to add cursor
    //  or something what can improve performance
    //
    // Unfiltered: the pg_class estimate, as before. Filtered by a single block:
    // an exact count scoped to that one block is already cheap. Otherwise the
    // filters are answered exactly by summing transaction_type_counts (V33) —
    // a few dozen rows — instead of counting the whole table per page.
    const countSubquery = blockHeight != null
      ? this.knex('transactions')
          .count('* as reltuples')
          .where('block_height', blockHeight)
          .modify((builder) => {
            if (transactionType != null) builder.where('type', transactionType);
            if (coinjoin != null) builder.where('coinjoin', coinjoin);
            if (multisig != null) builder.where('multisig', multisig);
          })
      : filtered
        ? this.knex('transaction_type_counts')
            .select(this.knex.raw('COALESCE(SUM(count), 0)::bigint as reltuples'))
            .modify((builder) => {
              if (transactionType != null) builder.where('type', transactionType);
              if (coinjoin != null) builder.where('coinjoin', coinjoin);
              if (multisig != null) builder.where('multisig', multisig);
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
        'transactions.size',
        'transactions.is_coinbase'
      )
      .whereNotNull('transactions.block_height')
      .modify((builder) => {
        if (transactionType != null) builder.where('transactions.type', transactionType);
        if (coinjoin != null) builder.where('transactions.coinjoin', coinjoin);
        if (multisig != null) builder.where('transactions.multisig', multisig);
        if (blockHeight != null) builder.where('transactions.block_height', blockHeight);
      })
      .orderBy('transactions.block_height', order)
      .orderBy('transactions.is_coinbase', 'desc')
      .orderBy('transactions.id', 'asc')
      .limit(limit)
      .offset(fromRank)

    const outputsCTE = this.outputsAggregate();

    const inputsCTE = this.inputsAggregate();

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
      .from('subquery')
      .orderBy('subquery.block_height', order)
      .orderBy('subquery.is_coinbase', 'desc')
      .orderBy('subquery.id', 'asc');


    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count);
  };

  getTransactionByHash = async (hash: string): Promise<Transaction | null> => {
    const blockMaxHeightSubquery = this.knex('blocks')
      .select(this.knex.raw('MAX(height) as max_height'))
      .as('height_subquery')

    const outputsCTE = this.outputsAggregate();

    const inputsCTE = this.inputsAggregate();

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
        'transactions.is_coinbase',
      )
      .where('transactions.block_height', height)
      .orderBy('transactions.is_coinbase', 'desc')
      .orderBy('transactions.id', order)
      .limit(limit)
      .offset(fromRank)

    const outputsCTE = this.outputsAggregate();

    const inputsCTE = this.inputsAggregate();

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
      .orderBy('subquery.is_coinbase', 'desc')
      .orderBy('subquery.id', order)

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

    const outputsCTE = this.outputsAggregate();

    const inputsCTE = this.inputsAggregate();

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

  getAddressTransactions = async (address: string, page: number, limit: number, order: string, transactionType?: TransactionType): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const addressIdSubquery = this.knex('addresses').select('id').where('address', address);

    // address_transactions holds one row per (address_id, tx_id) carrying block_height, so
    // a single address's page is an index range scan over (address_id,
    // block_height DESC) that stops at LIMIT — no tx_outputs/tx_inputs union.
    // A type filter lives on transactions, so join it in only when present.
    const addressTxIdsCTE = this.knex('address_transactions')
      .where('address_transactions.address_id', addressIdSubquery)
      .select('address_transactions.tx_id')
      .select('address_transactions.block_height')
      .modify((builder) => {
        if (transactionType != null) {
          builder
            .join('transactions', 'transactions.id', 'address_transactions.tx_id')
            .where('transactions.type', transactionType);
        }
      })
      .orderBy('address_transactions.block_height', order)
      .limit(limit)
      .offset(fromRank);

    // Unfiltered, the total is the stored per-address counter (V28) — no scan of
    // this address's index entries at all. A type filter has no counter, so it
    // still counts, scoped to the one address.
    const countSubquery = transactionType != null
      ? this.knex('address_transactions')
          .where('address_transactions.address_id', addressIdSubquery)
          .join('transactions', 'transactions.id', 'address_transactions.tx_id')
          .where('transactions.type', transactionType)
          .count('*')
      : this.knex('addresses')
          .where('address', address)
          .select('tx_count');

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

    const outputsCTE = this.outputsAggregate();

    const inputsCTE = this.inputsAggregate();

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
      .whereIn('addresses.address', this.knex('masternodes')
        .where('pro_tx_hash', proTxHash)
        .select(this.knex.raw('unnest(ARRAY[payee, owner_address, voting_address, collateral_address])')))
      .select('addresses.id');

    // address_transactions is the per-address tx index: one row per (address_id, tx_id)
    // carrying block_height. Ranging it by (address_id, block_height DESC) gives
    // the page directly off the index — no full-history scan or sort. A tx can
    // appear under several of the masternode's addresses, so dedup per tx_id
    // (MAX block_height is identical across them — same tx, same block).
    const addressTxIdsCTE = this.knex('address_transactions')
      .whereIn('address_id', this.knex('masternode_address_ids').select('id'))
      .select('tx_id')
      .max('block_height as block_height')
      .groupBy('tx_id')
      .orderBy('block_height', order)
      .limit(limit)
      .offset(fromRank);

    // A masternode's payee/owner/voting/collateral addresses often overlap, and
    // one transaction can touch several of them. Summing per-address counters
    // (or the weekly rollup, as this did) counts such a transaction once per
    // address, overstating the total — so this counts distinct tx_ids. It stays
    // an index-only scan of (address_id, block_height) INCLUDE (tx_id), bounded
    // to at most four addresses.
    const countSubquery = this.knex('address_transactions')
      .whereIn('address_id', this.knex('masternode_address_ids').select('id'))
      .countDistinct('tx_id as count');

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
      .orderBy('transactions.block_height', order);

    const outputsCTE = this.outputsAggregate();

    const inputsCTE = this.inputsAggregate();

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

  // Whole hours inside the window come from chain_stats_hourly (V32); only the
  // partial hours at each edge are counted live off `transactions`, and those
  // are resolved to a literal block-height range first so the planner can index
  // into the table. A window shorter than an hour boundary runs fully live, as
  // it always did — it is cheap by definition.
  getTransactionStats = async (start: Date, end: Date): Promise<TransactionStats | null> => {
    const msPerHour = 3600000;
    const hourLo = new Date(Math.ceil(start.getTime() / msPerHour) * msPerHour);
    const hourHi = new Date(Math.floor(end.getTime() / msPerHour) * msPerHour);
    const useRollup = hourLo.getTime() < hourHi.getTime();

    // Bucket `h` covers [h, h+1h), so it lies entirely inside the window only
    // for h in [hourLo, hourHi). The -1ms keeps the leading live slice from
    // overlapping the first bucket it hands off to.
    const liveSlices: Array<{ from: Date; to: Date }> = [];

    if (useRollup) {
      if (start.getTime() < hourLo.getTime()) {
        liveSlices.push({ from: start, to: new Date(hourLo.getTime() - 1) });
      }
      if (hourHi.getTime() < end.getTime()) {
        liveSlices.push({ from: hourHi, to: end });
      }
    } else {
      liveSlices.push({ from: start, to: end });
    }

    const totals = { special: 0, coinjoin: 0, multisig: 0, normal: 0 };

    const add = (row: any) => {
      if (row == null) return;
      totals.special += Number(row.special ?? 0);
      totals.coinjoin += Number(row.coinjoin ?? 0);
      totals.multisig += Number(row.multisig ?? 0);
      totals.normal += Number(row.normal ?? 0);
    };

    if (useRollup) {
      const [row] = await this.knex('chain_stats_hourly')
        .where('hour', '>=', hourLo.toISOString())
        .andWhere('hour', '<', hourHi.toISOString())
        .select(
          this.knex.raw('COALESCE(SUM(special), 0)::bigint AS special'),
          this.knex.raw('COALESCE(SUM(coinjoin), 0)::bigint AS coinjoin'),
          this.knex.raw('COALESCE(SUM(multisig), 0)::bigint AS multisig'),
          this.knex.raw('COALESCE(SUM(normal), 0)::bigint AS normal'),
        );

      add(row);
    }

    for (const { from, to } of liveSlices) {
      const [heights] = await this.knex('blocks')
        .whereBetween('timestamp', [from.toISOString(), to.toISOString()])
        .select(
          this.knex.raw('MIN(height) AS min_height'),
          this.knex.raw('MAX(height) AS max_height'),
        ) as any[];

      if (heights?.min_height == null) {
        continue; // no blocks inside this slice
      }

      const [row] = await this.knex('transactions')
        .whereBetween('block_height', [heights.min_height, heights.max_height])
        .select(
          this.knex.raw('COUNT(*) FILTER (WHERE type > 0)::bigint AS special'),
          this.knex.raw('COUNT(*) FILTER (WHERE coinjoin)::bigint AS coinjoin'),
          this.knex.raw('COUNT(*) FILTER (WHERE multisig)::bigint AS multisig'),
          this.knex.raw('COUNT(*) FILTER (WHERE type = 0 AND NOT coinjoin AND NOT multisig)::bigint AS normal'),
        );

      add(row);
    }

    return TransactionStats.fromRow(totals);
  }
}
