interface BlockRow {
  height: number;
  hash: string;
  version: number;
  timestamp: Date;
  size: number;
  difficulty: number;
  merkle_root: string;
  previous_block_hash: string;
  nonce: bigint;
  tx_count: number;
  block_size: number;
  credit_pool_balance: number;
  confirmations: number;
  superblock: boolean;
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
  nonce?: bigint;
  confirmations?: number;
  superblock?: boolean;
}

export default class Block {
  height: number | null;
  hash: string | null;
  version: number | null;
  timestamp: Date | null;
  txCount: number | null;
  size: number | null;
  creditPoolBalance: number | null;
  difficulty: number | null;
  merkleRoot: string | undefined;
  previousBlockHash: string | null;
  nonce: bigint;
  confirmations: number | null;
  superblock: boolean | null;

  constructor(
    height?: number,
    hash?: string,
    version?: number,
    timestamp?: Date,
    txCount?: number,
    size?: number,
    creditPoolBalance?: number,
    difficulty?: number,
    merkleRoot?: string,
    previousBlockHash?: string,
    nonce?: bigint,
    confirmations?: number,
    superblock?: boolean,
  ) {
    this.height = height ?? null;
    this.hash = hash ?? null;
    this.version = version ?? null;
    this.timestamp = timestamp ?? null;
    this.txCount = txCount ?? null;
    this.size = size ?? null;
    this.creditPoolBalance = creditPoolBalance ?? null;
    this.difficulty = difficulty ?? null;
    this.merkleRoot = merkleRoot;
    this.previousBlockHash = previousBlockHash ?? null;
    this.nonce = nonce ?? null;
    this.confirmations = confirmations ?? null;
    this.superblock = superblock ?? null;
  }

  static fromRow({ height, hash, version, timestamp, tx_count, size, credit_pool_balance, difficulty, merkle_root, previous_block_hash, nonce, confirmations, superblock }: BlockRow): Block {
    return new Block(height, hash, version, timestamp, tx_count, size, credit_pool_balance, difficulty, merkle_root, previous_block_hash, nonce, confirmations, superblock);
  }

  static fromObject({ height, hash, version, timestamp, txCount, size, creditPoolBalance, difficulty, merkleRoot, previousBlockHash, nonce, confirmations, superblock }: BlockObject): Block {
    return new Block(height, hash, version, timestamp, txCount, size, creditPoolBalance, difficulty, merkleRoot, previousBlockHash, nonce, confirmations, superblock);
  }
}
