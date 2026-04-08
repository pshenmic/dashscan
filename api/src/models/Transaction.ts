import VIn from './VIn';
import VOut from './VOut';
import {Script} from 'dash-core-sdk/dist/src/types/Script';

interface TransactionRow {
  hash: string;
  type: number;
  block_height: number;
  block_hash: string;
  timestamp: Date;
  confirmations: number;
  instant_lock: string;
  chain_locked: boolean;
  version: number;
  size: number;
}

interface TransactionObject {
  hash?: string;
  type?: number;
  blockHeight?: number;
  blockHash?: string;
  amount?: number;
  version?: number;
  vIn?: any[];
  vOut?: any[];
  confirmations?: number;
  instantLock?: string;
  timestamp?: Date;
  chainLocked?: boolean;
  size?: number;
}

export default class Transaction {
  hash: string | null;
  type: number | null;
  blockHeight: number | null;
  blockHash: string | null;
  timestamp: Date | null;
  amount: number | null;
  version: number | null;
  vIn: VIn[] | null;
  vOut: VOut[] | null;
  confirmations: number | null;
  instantLock: string | null;
  chainLocked: boolean | null;
  size: number | null;

  constructor(
    hash?: string,
    type?: number,
    blockHeight?: number,
    blockHash?: string,
    amount?: number,
    version?: number,
    vIn?: VIn[],
    vOut?: VOut[],
    confirmations?: number,
    instantLock?: string,
    timestamp?: Date,
    chainLock?: boolean,
    size?: number,
) {
    this.hash = hash ?? null;
    this.type = type ?? null;
    this.blockHeight = blockHeight ?? null;
    this.blockHash = blockHash ?? null;
    this.timestamp = timestamp ?? null;
    this.amount = amount ?? null;
    this.version = version ?? null;
    this.vIn = vIn ?? null;
    this.vOut = vOut ?? null;
    this.confirmations = confirmations ?? null;
    this.instantLock = instantLock ?? null;
    this.chainLocked = chainLock ?? null;
    this.size = size ?? null;
  }

  static fromRow({hash, type, block_height, block_hash, timestamp, version, confirmations, instant_lock, chain_locked, size}: TransactionRow): Transaction {
    return new Transaction(hash, type, block_height, block_hash, undefined, version, undefined, undefined, confirmations, instant_lock, timestamp, chain_locked, size);
  }

  static fromObject({
                      hash,
                      type,
                      blockHeight,
                      blockHash,
                      amount,
                      version,
                      vIn,
                      vOut,
                      confirmations,
                      instantLock,
                      timestamp,
                      chainLocked,
                      size,
                    }: TransactionObject): Transaction {
    let normalVIn: VIn[] | undefined;
    let normalVOut: VOut[] | undefined;

    if (vIn) {
      normalVIn = vIn.map((input) => {
        if(!(input instanceof VIn)) {
          return VIn.fromObject({
            txId: input.prev_tx_hash,
            vOut: input.prev_vout,
            scriptSigASM: Script.fromHex(input.scriptSig?.hex ?? '').ASMString(),
            sequence: input.sequence,
          });
        } else {
          return VIn.fromObject(input)
        }
      });
    }

    if (vOut) {
      normalVOut = vOut.map((output) => {
        if(!(output instanceof VOut)) {
          return VOut.fromObject({
            value: output.valueSat.toString(),
            n: output.n,
            scriptPubKeyASM: Script.fromHex(output.scriptPubKey?.hex ?? '').ASMString(),
          });
        } else {
          return VOut.fromObject(output)
        }
      });
    }

    return new Transaction(hash, type, blockHeight, blockHash, amount, version, normalVIn, normalVOut, confirmations, instantLock, timestamp, chainLocked, size);
  }
}
