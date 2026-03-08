import { Knex } from 'knex';
import Transaction from '../models/Transaction';
import VIn from '../models/VIn';
import VOut from '../models/VOut';
import PaginatedResultSet from '../models/PaginatedResultSet';

export default class TransactionsDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  getTransactions = async (page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const rows = await this.knex('transactions')
      .select(
        'transactions.hash',
        'transactions.type',
        'transactions.block_hash',
        'blocks.height as block_height',
        'blocks.timestamp as timestamp',
      )
      .select(this.knex('transactions').count('hash').as('total_count'))
      .leftJoin('blocks', 'blocks.hash', 'transactions.block_hash')
      .orderBy('blocks.height', order)
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    return new PaginatedResultSet(rows.map(Transaction.fromRow), page, limit, row?.total_count);
  };

  getTransactionByHash = async (hash: string): Promise<Transaction | null> => {
    const row = await this.knex('transactions')
      .select(
        'transactions.hash',
        'transactions.type',
        'transactions.version',
        'transactions.size',
        'transactions.block_hash',
        'transactions.locktime',
        'transactions.is_coinbase',
        'blocks.height as height',
        'blocks.timestamp as timestamp',
      )
      .leftJoin('blocks', 'blocks.hash', 'transactions.block_hash')
      .where('transactions.hash', hash.trim())
      .first();

    if (!row) return null;

    const inputRows = await this.knex('tx_inputs')
      .where('txid', hash.trim())
      .orderBy('vin_index');

    const outputRows = await this.knex('tx_outputs')
      .where('txid', hash.trim())
      .orderBy('vout_index');

    const vIn = inputRows.map(({ prev_txid, prev_vout_index }: { prev_txid: string; prev_vout_index: number }) =>
      VIn.fromObject({ txId: prev_txid?.trim(), vOut: prev_vout_index }),
    );

    const vOut = outputRows.map(({ value, vout_index, script_pub_key }: { value: bigint; vout_index: number; script_pub_key: string }) =>
      VOut.fromObject({ value: value?.toString(), number: vout_index, scriptPubKeyASM: script_pub_key }),
    );

    return new Transaction(
      row.hash.trim(),
      row.type,
      row.height,
      row.block_hash?.trim(),
      null,
      row.version,
      vIn,
      vOut,
      null,
      null,
      row.timestamp,
    );
  };

  getTransactionHistory = async (): Promise<{ timestamp: number; count: number }[]> => {
    const rows = await this.knex('transactions')
      .join('blocks', 'blocks.hash', 'transactions.block_hash')
      .where('blocks.timestamp', '>=', this.knex.raw("NOW() - INTERVAL '24 hours'"))
      .groupByRaw("date_trunc('hour', blocks.timestamp)")
      .orderByRaw("date_trunc('hour', blocks.timestamp) ASC")
      .select(this.knex.raw("date_trunc('hour', blocks.timestamp) as hour"))
      .count('transactions.hash as count');

    return (rows as any[]).map(({ hour, count }: { hour: Date; count: string }) => ({
      timestamp: Math.floor(new Date(hour).getTime() / 1000),
      count: Number(count),
    }));
  };

  getTransactionsByBlockHeight = async (height: number, page: number, limit: number, order: string): Promise<PaginatedResultSet<Transaction>> => {
    const fromRank = (page - 1) * limit;

    const rows = await this.knex('transactions')
      .select('transactions.hash')
      .select(this.knex('transactions').where('block_hash', this.knex('blocks').select('hash').where('height', height)).count('hash').as('total_count'))
      .leftJoin('blocks', 'blocks.hash', 'transactions.block_hash')
      .where('blocks.height', height)
      .orderBy('transactions.hash', order)
      .limit(limit)
      .offset(fromRank);

    const [row] = rows;

    const transactions = await Promise.all(rows.map(({ hash }: { hash: string }) => this.getTransactionByHash(hash)));

    return new PaginatedResultSet(transactions as Transaction[], page, limit, row?.total_count);
  };
}