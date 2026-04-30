import {Knex} from 'knex';
import Block from '../models/Block';
import ChainStats from '../models/ChainStats';
import PaginatedResultSet from '../models/PaginatedResultSet';
import SeriesData from '../models/SeriesData';

export default class BlocksDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getBlocks = async (page: number, limit: number, order: string, superblock?: boolean): Promise<PaginatedResultSet<Block>> => {
    const fromRank = (page - 1) * limit;

    // TODO: Implement more accurate solution
    // we cannot use count() on tables with 100 million rows
    // we can use pg_class to get approximate information about the table
    const countSubquery = superblock
      ? this.knex('blocks').count('* as reltuples').where('superblock', true)
      : this.knex('pg_class')
          .select(this.knex.raw('reltuples::bigint'))
          .whereRaw(`relname='blocks'`)
          .limit(1)

    const subquery = this.knex('blocks')
      .with('total_count', countSubquery)
      .select(this.knex('total_count').as('total_count'))
      .select('blocks.height', 'blocks.hash', 'blocks.difficulty',
        'blocks.version', 'blocks.timestamp', 'blocks.tx_count',
        'blocks.size', 'blocks.nonce', 'blocks.previous_block_hash',
        'blocks.merkle_root', 'blocks.credit_pool_balance', 'blocks.superblock')
      .modify((builder) => {
        if (superblock != null && typeof superblock === 'boolean') {
          builder.where('blocks.superblock', superblock);
        }
      })
      .orderBy('height', order)
      .limit(limit)
      .offset(fromRank)
      .as('subquery');

    const blockMaxHeightSubquery = this.knex('blocks')
      .select(this.knex.raw('MAX(height) as max_height'))
      .as('height_subquery')

    const rows =await this.knex(subquery)
      .select(this.knex.raw('max_height - subquery.height + 1 AS confirmations'))
      .select('height', 'hash', 'difficulty',
        'version', 'timestamp', 'tx_count','superblock',
        'size', 'nonce', 'previous_block_hash',
        'merkle_root', 'credit_pool_balance', 'total_count')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))

    const [row] = rows;

    return new PaginatedResultSet(rows.map(row => Block.fromRow(row)), page, limit, row?.total_count);
  };

  getTxCountStats = async (start: Date, end: Date, interval: string, intervalInMs: number): Promise<SeriesData[]> => {
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

    const bucketsCTE = this.knex('ranges')
      .select('date_from')
      .select(this.knex.raw('AVG(blocks.tx_count) AS avg_tx_count'))
      .leftJoin('blocks', function () {
        this.on('blocks.timestamp', '>', 'ranges.date_from')
          .andOn('blocks.timestamp', '<=', 'ranges.date_to');
      })
      .groupBy('date_from');

    const rows = await this.knex
      .with('ranges', ranges)
      .with('buckets', bucketsCTE)
      .select('date_from', 'avg_tx_count')
      .select(this.knex.raw('COALESCE(avg_tx_count, 0) AS avg_tx_count'))
      .from('buckets')
      .orderBy('date_from', 'asc');

    return rows.map((row: any) => new SeriesData(
      new Date(row.date_from),
      { avg: row.avg_tx_count !== null ? parseFloat(parseFloat(row.avg_tx_count).toFixed(2)) : null },
    ));
  }

  getChainStats = async (blocksForHashRate: number, blocksForBlockTime: number): Promise<ChainStats> => {
    const topBlocks = this.knex('blocks')
      .select('height', 'timestamp', 'difficulty', 'tx_count')
      .orderBy('height', 'desc')
      .limit(blocksForHashRate)
      .as('top_blocks');

    const recentCTE = this.knex
      .select('height', 'timestamp', 'difficulty', 'tx_count')
      .select(this.knex.raw('ROW_NUMBER() OVER (ORDER BY height DESC) AS rn'))
      .select(this.knex.raw('COUNT(*) OVER () AS total'))
      .from(topBlocks);

    const [row] = await this.knex
      .with('recent', recentCTE)
      .select(this.knex.raw('MAX(CASE WHEN rn = 1 THEN height END) AS latest_height'))
      .select(this.knex.raw('MAX(CASE WHEN rn = 1 THEN timestamp END) AS last_timestamp'))
      .select(this.knex.raw('MAX(CASE WHEN rn = total THEN timestamp END) AS first_timestamp'))
      .select(this.knex.raw('SUM(difficulty) AS work_sum'))
      .select(this.knex.raw('MAX(CASE WHEN rn = LEAST(?, total) THEN timestamp END) AS bt_first_timestamp', [blocksForBlockTime]))
      .select(this.knex.raw('SUM(CASE WHEN rn <= ? THEN tx_count ELSE 0 END)::bigint AS bt_tx_count', [blocksForBlockTime]))
      .select(this.knex.raw('LEAST(MAX(total), ?) AS bt_sample_size', [blocksForBlockTime]))
      .select(this.knex.raw('(SELECT COUNT(*) FROM transactions WHERE block_height IS NULL)::bigint AS mempool_size'))
      .from('recent');

    return ChainStats.fromRow(row);
  };

  getBlockByHash = async (hash: string): Promise<Block | null> => {
    const rows = await this.knex('blocks')
      .select('blocks.height', 'blocks.hash', 'blocks.difficulty', 'blocks.superblock',
        'blocks.version', 'blocks.timestamp', 'blocks.tx_count', 'blocks.size', 'blocks.nonce',
        'blocks.previous_block_hash', 'blocks.merkle_root', 'blocks.credit_pool_balance')
      .select(this.knex.raw('(SELECT MAX(height) FROM blocks) - blocks.height + 1 AS confirmations'))
      .where('blocks.hash', hash)
      .limit(1)

    const [row] = rows;

    if (row == null) {
      return null;
    }

    return Block.fromRow(row)
  };
}
