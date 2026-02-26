import { Knex } from 'knex';
import DashCoreRPC from '../dashcoreRPC';
import Block from '../models/Block';
import PaginatedResultSet from '../models/PaginatedResultSet';

export default class BlocksDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getBlocks = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Block>> => {
    const fromRank = (page - 1) * limit;

    const rows = await this.knex('blocks')
      .select('blocks.height', 'blocks.hash', 'blocks.difficulty', 'blocks.version', 'blocks.timestamp', 'blocks.tx_count', 'blocks.size', 'blocks.nonce', 'blocks.previous_block_hash')
      .select(this.knex('blocks').count('height').as('total_count'))
      .orderBy('height', order)
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    return new PaginatedResultSet(rows.map(row => Block.fromRow(row)), page, limit, row?.total_count);
  };

  getBlockByHash = async (hash: string): Promise<Block | null> => {
    const rows = await this.knex('blocks')
        .select('blocks.height', 'blocks.hash', 'blocks.difficulty', 'blocks.version', 'blocks.timestamp', 'blocks.tx_count', 'blocks.size', 'blocks.nonce', 'blocks.previous_block_hash')
        .where('blocks.hash', hash)
        .limit(1)

    const [row] = rows;

    if (row == null)  {
      return null;
    }

    return Block.fromRow(row)
  };
}
