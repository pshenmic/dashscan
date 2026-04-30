import VIn from './VIn';
import VOut from './VOut';
import {Script} from 'dash-core-sdk/dist/src/types/Script';
import {TransactionType} from "../enums/TransactionType";

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
  inputs: any[];
  outputs: any[];
  coinbase_amount: string | null;
  transfer_amount: string | null;
  coinjoin: boolean;
  multisig: boolean;
}

interface TransactionObject {
  hash?: string;
  type?: string;
  blockHeight?: number;
  blockHash?: string;
  amount?: string | null;
  version?: number;
  vIn?: any[];
  vOut?: any[];
  confirmations?: number;
  instantLock?: string;
  timestamp?: Date;
  chainLocked?: boolean;
  size?: number;
  coinbaseAmount?: string | null;
  coinjoin?: boolean;
  multisig?: boolean;
}

export default class Transaction {
  hash: string | null;
  type: string | null;
  blockHeight: number | null;
  blockHash: string | null;
  timestamp: Date | null;
  amount: string | null;
  version: number | null;
  vIn: VIn[] | null;
  vOut: VOut[] | null;
  confirmations: number | null;
  instantLock: string | null;
  chainLocked: boolean | null;
  size: number | null;
  coinbaseAmount: string | null;
  coinjoin: boolean | null;
  multisig: boolean | null;
  constructor(
    hash?: string,
    type?: string,
    blockHeight?: number,
    blockHash?: string,
    amount?: string | null,
    version?: number,
    vIn?: VIn[],
    vOut?: VOut[],
    confirmations?: number,
    instantLock?: string,
    timestamp?: Date,
    chainLock?: boolean,
    size?: number,
    coinbaseAmount?: string | null,
    coinjoin?: boolean,
    multisig?: boolean,
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
    this.coinbaseAmount = coinbaseAmount ?? null;
    this.coinjoin = coinjoin ?? null;
    this.multisig = multisig ?? null;
  }

  static fromRow({hash, type, block_height, block_hash, timestamp, version, confirmations, instant_lock, chain_locked, size, inputs, outputs, coinbase_amount, transfer_amount, coinjoin, multisig}: TransactionRow): Transaction {
    let normalVOut: VOut[] | null = null;
    let normalVIn: VIn[] | null = null;

    if(outputs!=null) {
      normalVOut = VOut.fromRows(outputs)
    }

    if(inputs!=null) {
      normalVIn = VIn.fromRows(inputs)
    }

    const typeText = type != null ? TransactionType[type] : null;

    return new Transaction(hash, typeText, block_height, block_hash, transfer_amount, version, normalVIn, normalVOut, confirmations, instant_lock, timestamp, chain_locked, size, coinbase_amount, coinjoin, multisig);
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
                      coinbaseAmount,
                      coinjoin,
                      multisig,
                    }: TransactionObject): Transaction {
    let normalVIn: VIn[] | undefined;
    let normalVOut: VOut[] | undefined;

    if (vIn) {
      normalVIn = vIn.map((input) => {
        if(!(input instanceof VIn)) {
          return VIn.fromObject({
            prevTxHash: input.prev_tx_hash,
            vOutIndex: input.prev_vout,
            scriptSigASM: Script.fromHex(input.scriptSig?.hex ?? '').ASMString(),
            sequence: input.sequence,
            amount: input.amount,
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
            value: output.valueSat?.toString(),
            number: output.n,
            scriptPubKeyASM: Script.fromHex(output.scriptPubKey?.hex ?? '').ASMString(),
          });
        } else {
          return VOut.fromObject(output)
        }
      });
    }

    return new Transaction(hash, type, blockHeight, blockHash, amount, version, normalVIn, normalVOut, confirmations, instantLock, timestamp, chainLocked, size, coinbaseAmount, coinjoin, multisig);
  }
}
