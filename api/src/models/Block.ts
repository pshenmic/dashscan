interface BlockRow {
  height: number;
  hash: string;
  version: number;
  timestamp: Date;
  txs_count: number;
  block_size: number;
  credit_pool_balance: number;
}

interface BlockObject {
  height?: number;
  hash?: string;
  version?: number;
  timestamp?: Date;
  txCount?: number;
  size?: number;
  creditPoolBalance?: number;
  txs?: string[];
  difficulty?: number;
  merkleRoot?: string;
  previousBlockHash?: string;
  nonce?: number;
  confirmations?: number;
}

export default class Block {
  height: number | null;
  hash: string | null;
  version: number | null;
  timestamp: Date | null;
  txCount: number | null;
  size: number | null;
  creditPoolBalance: number | null;
  txs: string[] | null;
  difficulty: number | null;
  merkleRoot: string | undefined;
  previousBlockHash: string | null;
  nonce: number | null;
  confirmations: number | null;

  constructor(
    height?: number,
    hash?: string,
    version?: number,
    timestamp?: Date,
    txCount?: number,
    size?: number,
    creditPoolBalance?: number,
    txs?: string[],
    difficulty?: number,
    merkleRoot?: string,
    previousBlockHash?: string,
    nonce?: number,
    confirmations?: number,
  ) {
    this.height = height ?? null;
    this.hash = hash ?? null;
    this.version = version ?? null;
    this.timestamp = timestamp ?? null;
    this.txCount = txCount ?? null;
    this.size = size ?? null;
    this.creditPoolBalance = creditPoolBalance ?? null;
    this.txs = txs ?? null;
    this.difficulty = difficulty ?? null;
    this.merkleRoot = merkleRoot;
    this.previousBlockHash = previousBlockHash ?? null;
    this.nonce = nonce ?? null;
    this.confirmations = confirmations ?? null;
  }

  static fromRow({ height, hash, version, timestamp, txs_count, block_size, credit_pool_balance }: BlockRow): Block {
    return new Block(height, hash, version, timestamp, txs_count, block_size, credit_pool_balance);
  }

  static fromObject({ height, hash, version, timestamp, txCount, size, creditPoolBalance, txs, difficulty, merkleRoot, previousBlockHash, nonce, confirmations }: BlockObject): Block {
    return new Block(height, hash, version, timestamp, txCount, size, creditPoolBalance, txs, difficulty, merkleRoot, previousBlockHash, nonce, confirmations);
  }
}
