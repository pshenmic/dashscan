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
      .select('height', 'hash', 'version', 'timestamp', 'txs_count', 'block_size', 'fee')
      .select(this.knex('blocks').count('height').as('total_count'))
      .orderBy('height', order)
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Block.fromRow), page, limit, row?.total_count);
  };

  getBlockByHash = async (hash: string): Promise<Block | null> => {
    let block: any;

    try {
      block = await DashCoreRPC.getBlock(hash, 1);
    } catch (e: any) {
      if (e.code === -5) {
        return null;
      } else {
        throw e;
      }
    }

    if (!block) {
      return null;
    }

    return Block.fromObject({
      height: block.height,
      hash: block.hash,
      version: block.version,
      size: block.size,
      timestamp: new Date(block.time * 1000),
      txCount: block.nTx,
      txs: block.tx,
      difficulty: block.difficulty,
      merkleRoot: block.merkleroot,
      previousBlockHash: block.previousblockhash,
      nonce: block.nonce,
      confirmations: block.confirmations,
    });
  };
}
