import VIn from './VIn';
import VOut from './VOut';
import { Script } from 'dash-core-sdk/dist/src/types/Script';

interface TransactionRow {
  hash: string;
  type: number;
  amount: number;
  block_height: number;
  block_hash: string;
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
  instantLock?: boolean;
}

export default class Transaction {
  txid: string | null;
  type: number | null;
  blockHeight: number | null;
  blockHash: string | null;
  amount: number | null;
  version: number | null;
  vIn: VIn[] | null;
  vOut: VOut[] | null;
  confirmations: number | null;
  instantLock: boolean | null;

  constructor(
    txid?: string,
    type?: number,
    blockHeight?: number,
    blockHash?: string,
    amount?: number,
    version?: number,
    vIn?: VIn[],
    vOut?: VOut[],
    confirmations?: number,
    instantLock?: boolean,
  ) {
    this.txid = txid ?? null;
    this.type = type ?? null;
    this.blockHeight = blockHeight ?? null;
    this.blockHash = blockHash ?? null;
    this.amount = amount ?? null;
    this.version = version ?? null;
    this.vIn = vIn ?? null;
    this.vOut = vOut ?? null;
    this.confirmations = confirmations ?? null;
    this.instantLock = instantLock ?? null;
  }

  static fromRow({ txid, type, amount, block_height, block_hash }: TransactionRow): Transaction {
    return new Transaction(txid, type, block_height, block_hash, amount);
  }

  static fromObject({ txid, type, blockHeight, blockHash, amount, version, vIn, vOut, confirmations, instantLock }: TransactionObject): Transaction {
    let normalVIn: VIn[] | undefined;
    let normalVOut: VOut[] | undefined;

    if (vIn) {
      normalVIn = vIn.map((input) => {
        return VIn.fromObject({
          txId: input.txid,
          vOut: input.vout,
          scriptSigASM: Script.fromHex(input.scriptSig?.hex ?? '').ASMString(),
          sequence: input.sequence,
        });
      });
    }

    if (vOut) {
      normalVOut = vOut.map((output) => {
        return VOut.fromObject({
          value: output.valueSat.toString(),
          n: output.n,
          scriptPubKeyASM: Script.fromHex(output.scriptPubKey?.hex ?? '').ASMString(),
        });
      });
    }

    return new Transaction(txid, type, blockHeight, blockHash, amount, version, normalVIn, normalVOut, confirmations, instantLock);
  }
}
