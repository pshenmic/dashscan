import { Knex } from 'knex';
import Block from '../models/Block';
import Transaction from '../models/Transaction';
import Masternode from '../models/Masternode';
import Address from '../models/Address';

export interface SearchResult {
  block: Block | null;
  transaction: Transaction | null;
  masternode: Masternode | null;
  address: Address | null;
}

const HEX64_RE = /^[0-9a-fA-F]{64}$/;
const INTEGER_RE = /^\d+$/;
// Dash P2PKH: mainnet X, testnet y — P2SH: mainnet 7, testnet 8
const ADDRESS_RE = {
  mainnet: /^[X7][1-9A-HJ-NP-Za-km-z]{25,33}$/,
  testnet: /^[y8][1-9A-HJ-NP-Za-km-z]{25,33}$/
}

export default class SearchDAO {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  private getBlockByHash = async (hash: string): Promise<Block | null> => {
    const row = await this.knex('blocks')
      .select('height', 'hash', 'difficulty', 'version', 'timestamp', 'tx_count', 'size', 'nonce', 'previous_block_hash')
      .where('hash', hash)
      .first();
    return row ? Block.fromRow(row) : null;
  };

  private getBlockByHeight = async (height: number): Promise<Block | null> => {
    const row = await this.knex('blocks')
      .select('height', 'hash', 'difficulty', 'version', 'timestamp', 'tx_count', 'size', 'nonce', 'previous_block_hash')
      .where('height', height)
      .first();
    return row ? Block.fromRow(row) : null;
  };

  private getTransactionByHash = async (hash: string): Promise<Transaction | null> => {
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
      )
      .leftJoin('blocks', 'blocks.hash', 'transactions.block_hash')
      .where('transactions.hash', hash)
      .first();
    if (!row) return null;
    return new Transaction(row.hash.trim(), row.type, row.height, row.block_hash?.trim(), null, row.version, [], [], null, null);
  };

  private getMasternodeByProTxHash = async (proTxHash: string): Promise<Masternode | null> => {
    const row = await this.knex('masternodes')
      .select(
        'pro_tx_hash', 'address', 'payee', 'status', 'type',
        'pos_penalty_score', 'consecutive_payments', 'last_paid_time',
        'last_paid_block', 'owner_address', 'voting_address',
        'collateral_address', 'pub_key_operator', 'created_at', 'updated_at',
      )
      .where('pro_tx_hash', proTxHash)
      .first();
    return row ? Masternode.fromRow(row) : null;
  };

  private getAddressByAddress = async (address: string): Promise<Address | null> => {
    const row = await this.knex('addresses')
      .select('address', 'first_seen_block', 'first_seen_tx', 'last_seen_block', 'last_seen_tx')
      .where('address', address)
      .first();
    return row ? Address.fromRow(row) : null;
  };

  search = async (query: string): Promise<SearchResult> => {
    const trimmed = query.trim();

    if (INTEGER_RE.test(trimmed)) {
      const block = await this.getBlockByHeight(parseInt(trimmed, 10));
      return { block, transaction: null, masternode: null, address: null };
    }

    if (HEX64_RE.test(trimmed)) {
      const [block, transaction, masternode] = await Promise.all([
        this.getBlockByHash(trimmed),
        this.getTransactionByHash(trimmed),
        this.getMasternodeByProTxHash(trimmed),
      ]);
      return { block, transaction, masternode, address: null };
    }

    if (ADDRESS_RE[process.env.NETWORK].test(trimmed)) {
      const address = await this.getAddressByAddress(trimmed);
      return { block: null, transaction: null, masternode: null, address };
    }

    return { block: null, transaction: null, masternode: null, address: null };
  };
}
