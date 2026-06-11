import {Knex} from 'knex';
import Address from '../models/Address';
import PaginatedResultSet from '../models/PaginatedResultSet';
import SeriesData from '../models/SeriesData';
import VIn from "../models/VIn";
import AddressBalance from "../models/AddressBalance";
import {
  ADDRESSES_ACTIVITY_DAILY_MIN_TX_COUNT,
  ADDRESSES_ACTIVITY_LOW_PRECISION_AFTER,
  ADDRESSES_ACTIVITY_WEEKLY_AFTER,
  ADDRESSES_ACTIVITY_WEEKLY_MIN_TX_COUNT,
} from "../constants";

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
        'last_block.hash as last_seen_block',
        'last_block.timestamp as last_seen_block_timestamp',
        'first_block.hash as first_seen_block',
        'first_block.timestamp as first_seen_block_timestamp',
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

  getBalancesInfo = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<AddressBalance>> => {
    const fromRank = (page - 1) * limit;

    const subquery = this.knex('pg_class')
      .select(this.knex.raw('reltuples::bigint'))
      .whereRaw(`relname='address_balances'`)
      .limit(1)
      .as('total_count')

    const rows = await this.knex('address_balances')
      .select('balance', 'address')
      .select(this.knex(subquery).as('total_count'))
      .orderBy('balance', order)
      .leftJoin('addresses', 'addresses.id', 'address_id')
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    return new PaginatedResultSet(rows, page, limit, row?.total_count ?? -1);
  }

  getAddressesActivity = async (start: Date, end: Date, page: number, limit: number, order: string): Promise<PaginatedResultSet<Address>> => {
    const fromRank = (page - 1) * limit;
    const msPerDay = 86400000;
    const fmtDay = (d: Date) => d.toISOString().slice(0, 10);

    // Window boundary math (plain dates, no queries yet). Short windows (≤3d)
    // run fully live; longer ones are stitched from the coarsest source able
    // to serve each stretch, keeping the partial edge days live so results
    // stay exact to the timestamp at any interval:
    //
    //   start ─live─ midnight ─daily─ Monday ─weekly─ Monday ─daily─ midnight ─live─ end
    //
    const isShortWindow = end.getTime() - start.getTime() <= ADDRESSES_ACTIVITY_LOW_PRECISION_AFTER;

    const startNextDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
    const endDayStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    const startsAtMidnight = startNextDay.getTime() - start.getTime() === msPerDay;

    // First whole-day boundary; whatever lies before it is served live.
    const dayLo = startsAtMidnight ? start : startNextDay;

    // Whole ISO weeks inside [dayLo, endDayStart): first Monday at or after
    // dayLo, last Monday at or before endDayStart (date_trunc('week') weeks
    // start on Monday; getUTCDay() is 0=Sun..6=Sat). Days outside that span
    // stay on the daily table.
    const weekLo = new Date(dayLo.getTime() + ((8 - dayLo.getUTCDay()) % 7) * msPerDay);
    const weekHi = new Date(endDayStart.getTime() - ((endDayStart.getUTCDay() + 6) % 7) * msPerDay);
    const useWeekly = !isShortWindow
      && end.getTime() - start.getTime() > ADDRESSES_ACTIVITY_WEEKLY_AFTER
      && weekLo < weekHi;

    // Timestamp slices computed live from the tx tables, and [lo, hi) day
    // ranges served by the daily rollup. The -1ms keeps the start slice
    // exclusive of the midnight the day buckets own, so nothing is counted
    // twice; the end slice [endDayStart, end] overlaps nothing because the
    // bucket of end's own day is never in the interior.
    const liveWindows: Array<{ from: Date; to: Date }> = [];
    const dayWindows: Array<{ from: Date; to: Date }> = [];

    if (isShortWindow) {
      liveWindows.push({ from: start, to: end });
    } else {
      if (!startsAtMidnight) liveWindows.push({ from: start, to: new Date(startNextDay.getTime() - 1) });
      if (end.getTime() > endDayStart.getTime()) liveWindows.push({ from: endDayStart, to: end });

      if (useWeekly) {
        if (dayLo < weekLo) dayWindows.push({ from: dayLo, to: weekLo });
        if (weekHi < endDayStart) dayWindows.push({ from: weekHi, to: endDayStart });
      } else if (dayLo < endDayStart) {
        dayWindows.push({ from: dayLo, to: endDayStart });
      }
    }

    // Subqueries — every part returns the same (address_id, tx_count) shape,
    // so any mix of them can be UNION ALL'ed and summed per address.
    const parts: Knex.QueryBuilder[] = [];

    for (const { from, to } of liveWindows) {
      // Resolve the slice to literal block heights first: concrete bounds let
      // the planner pick index nested-loops into the huge tx tables.
      const heightRanges = await this.knex('blocks')
        .whereBetween('timestamp', [from.toISOString(), to.toISOString()])
        .select(
          this.knex.raw('min(height) as height_from'),
          this.knex.raw('max(height) as height_to'),
        );

      const [heights] = heightRanges as any[];

      if (heights?.height_from == null) {
        continue; // no blocks inside this slice
      }

      const windowTxs = this.knex('transactions')
        .whereBetween('block_height', [heights.height_from, heights.height_to])
        .select('id as tx_id');

      // UNION dedups (address_id, tx_id) pairs, so an address counts a
      // transaction once even when it appears on both the input and output
      // side. Derived tables (not CTEs) so both live slices can sit in one
      // statement without name collisions.
      const addressTxs = this.knex('tx_outputs')
        .join(windowTxs.clone().as('window_txs'), 'window_txs.tx_id', 'tx_outputs.tx_id')
        .whereNotNull('tx_outputs.address_id')
        .select('tx_outputs.address_id', 'tx_outputs.tx_id')
        .union(
          this.knex('tx_inputs')
            .join(windowTxs.clone().as('window_txs'), 'window_txs.tx_id', 'tx_inputs.tx_id')
            .whereNotNull('tx_inputs.address_id')
            .select('tx_inputs.address_id', 'tx_inputs.tx_id'),
        );

      parts.push(
        this.knex(addressTxs.as('address_txs'))
          .select('address_id')
          .count('* as tx_count')
          .groupBy('address_id'),
      );
    }

    for (const { from, to } of dayWindows) {
      parts.push(
        this.knex('address_activity')
          .where('day', '>=', fmtDay(from))
          .andWhere('day', '<', fmtDay(to))
          .andWhere('tx_count', '>', ADDRESSES_ACTIVITY_DAILY_MIN_TX_COUNT)
          .select('address_id', 'tx_count'),
      );
    }

    if (useWeekly) {
      parts.push(
        this.knex('address_activity_weekly')
          .where('week', '>=', fmtDay(weekLo))
          .andWhere('week', '<', fmtDay(weekHi))
          .andWhere('tx_count', '>', ADDRESSES_ACTIVITY_WEEKLY_MIN_TX_COUNT)
          .select('address_id', 'tx_count'),
      );
    }

    if (parts.length === 0) {
      return new PaginatedResultSet([], page, limit, -1);
    }


    // Union from an empty base builder: hanging the unions off parts[0] would
    // render that part's GROUP BY after the union list (knex places the base
    // query's trailing clauses last), which is invalid SQL.
    const activity = this.knex.queryBuilder().unionAll(parts, true);

    const ranked = this.knex('activity')
      .select('address_id')
      .sum('tx_count as tx_count')
      .groupBy('address_id');

    // Paginate over the narrow (address_id, tx_count) ranking first and only
    // then join addresses, so the join and the final sort touch `limit` rows
    // instead of the whole ranking (which can exceed a million addresses).
    // The tie-break is address_id, not address, for the same reason. Keeping
    // total_count as a scalar subquery instead of count(*) OVER () lets the
    // pagination sort run as an in-memory top-N heapsort rather than a full
    // sort feeding a window aggregate.
    const rankedPage = this.knex('ranked')
      .select('address_id', 'tx_count')
      .orderBy('tx_count', order)
      .orderBy('address_id', 'asc')
      .limit(limit)
      .offset(fromRank);

    const rows = await this.knex('ranked_page')
      .with('activity', activity)
      .with('ranked', ranked)
      .with('ranked_page', rankedPage)
      .join('addresses', 'addresses.id', 'ranked_page.address_id')
      .select('addresses.address')
      .select(this.knex.raw('ranked_page.tx_count::text as tx_count'))
      .select(this.knex('ranked').count('*').as('total_count'))
      .orderBy('ranked_page.tx_count', order)
      .orderBy('ranked_page.address_id', 'asc');

    const [row] = rows;

    return new PaginatedResultSet(
      rows.map((r: any) => Address.fromRow(r)),
      page,
      limit,
      row?.total_count ?? -1,
    );
  }
}