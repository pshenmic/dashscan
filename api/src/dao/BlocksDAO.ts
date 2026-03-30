import {Knex} from 'knex';
import Block from '../models/Block';
import PaginatedResultSet from '../models/PaginatedResultSet';

export default class BlocksDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getBlocks = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Block>> => {
    const fromRank = (page - 1) * limit;

    // TODO: Implement more accurate solution
    // we cannot use count() on tables with 100 million rows
    // we can use pg_class to get approximate information about the table
    const countSubquery = this.knex('pg_class')
      .select(this.knex.raw('reltuples::bigint'))
      .whereRaw(`relname='blocks'`)
      .limit(1)

    const subquery = this.knex('blocks')
      .with('total_count', countSubquery)
      .select(this.knex('total_count').as('total_count'))
      .select('blocks.height', 'blocks.hash', 'blocks.difficulty',
        'blocks.version', 'blocks.timestamp', 'blocks.tx_count',
        'blocks.size', 'blocks.nonce', 'blocks.previous_block_hash',
        'blocks.merkle_root', 'blocks.credit_pool_balance')
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
        'version', 'timestamp', 'tx_count',
        'size', 'nonce', 'previous_block_hash',
        'merkle_root', 'credit_pool_balance', 'total_count')
      .join(blockMaxHeightSubquery, this.knex.raw('true'))

    const [row] = rows;

    return new PaginatedResultSet(rows.map(row => Block.fromRow(row)), page, limit, row?.total_count);
  };

  getBlockByHash = async (hash: string): Promise<Block | null> => {
    const rows = await this.knex('blocks')
      .select('blocks.height', 'blocks.hash', 'blocks.difficulty', 'blocks.version', 'blocks.timestamp', 'blocks.tx_count', 'blocks.size', 'blocks.nonce', 'blocks.previous_block_hash', 'blocks.merkle_root', 'blocks.credit_pool_balance')
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
