import { Knex } from 'knex';
import Transaction from '../models/Transaction';
import DashCoreRPC from '../dashcoreRPC';
import PaginatedResultSet from '../models/PaginatedResultSet';

export default class TransactionsDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getTransactions = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const subquery = this.knex('transactions')
      .select('hash', 'type', 'amount', 'block_height')
      .orderBy('block_height', order)
      .limit(limit)
      .offset(fromRank)
      .as('subquery');

    const rows = await this.knex(subquery)
      .select('subquery.hash', 'type', 'amount', 'blocks.hash as block_hash', 'blocks.height as block_height')
      .select(this.knex('transactions').count('id').limit(1).as('total_count'))
      .leftJoin('blocks', 'blocks.height', 'block_height');

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count);
  };

  getTransactionByHash = async (hash: string): Promise<Transaction | null> => {
    let tx: any;

    try {
      tx = await DashCoreRPC.getTransactionByHash(hash);
    } catch (e: any) {
      if (e.code === -5) {
        return null;
      } else {
        throw e;
      }
    }

    return Transaction.fromObject({
      hash: tx.txid,
      type: tx.type,
      version: tx.version,
      blockHash: tx.blockhash,
      blockHeight: tx.height,
      confirmations: tx.confirmations,
      instantLock: tx.instantlock,
      vIn: tx.vin,
      vOut: tx.vout,
    });
  };

  getTransactionsByBlockHeight = async (height: number, page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const subquery = this.knex('transactions')
      .select('hash', 'id')
      .where('block_height', '=', height);

    const rows = await this.knex
      .with('subquery', subquery)
      .select('hash', 'id')
      .select(this.knex('subquery').count('id').limit(1).as('total_count'))
      .orderBy('id', order)
      .offset(fromRank)
      .limit(limit)
      .from('subquery')
      .as('subquery_with_count');

    const [row] = rows;

    const transactions = await Promise.all(rows.map(({ hash }: { hash: string }) => this.getTransactionByHash(hash)));

    return new PaginatedResultSet(transactions as Transaction[], page, limit, row?.total_count);
  };
}
