import VIn from './VIn';
import VOut from './VOut';
import {TransactionType} from "../enums/TransactionType";

import {Script} from "dash-core-sdk";
import {ProRegTX} from "dash-core-sdk/src/types/ExtraPayload/ProRegTX";
import { ProUpServTx } from "dash-core-sdk/src/types/ExtraPayload/ProUpServTx";
import {ProUpRegTx} from "dash-core-sdk/src/types/ExtraPayload/ProUpRegTx";
import {ProUpRevTx} from "dash-core-sdk/src/types/ExtraPayload/ProUpRevTx";
import {CbTx} from "dash-core-sdk/src/types/ExtraPayload/CbTx";
import {QcTx} from "dash-core-sdk/src/types/ExtraPayload/QcTx";
import {MnHfTx} from "dash-core-sdk/src/types/ExtraPayload/MnHfTx";
import {AssetLockTx} from "dash-core-sdk/src/types/ExtraPayload/AssetLockTx";
import {AssetUnlockTx} from "dash-core-sdk/src/types/ExtraPayload/AssetUnlockTx";

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
  transfer_amount: string | null;
  coinjoin: boolean;
  multisig: boolean;
  extra_payload?: any;
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
  coinjoin?: boolean;
  multisig?: boolean;
  extraPayload?: ProRegTX
    | ProUpServTx
    | ProUpRegTx
    | ProUpRevTx
    | CbTx
    | QcTx
    | MnHfTx
    | AssetLockTx
    | AssetUnlockTx;
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
  coinjoin: boolean | null;
  multisig: boolean | null;
  extraPayload: ProRegTX
    | ProUpServTx
    | ProUpRegTx
    | ProUpRevTx
    | CbTx
    | QcTx
    | MnHfTx
    | AssetLockTx
    | AssetUnlockTx | null;

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
    coinjoin?: boolean,
    multisig?: boolean,
    extraPayload?: ProRegTX
      | ProUpServTx
      | ProUpRegTx
      | ProUpRevTx
      | CbTx
      | QcTx
      | MnHfTx
      | AssetLockTx
      | AssetUnlockTx,
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
    this.coinjoin = coinjoin ?? null;
    this.multisig = multisig ?? null;
    this.extraPayload = extraPayload ?? null;
  }

  static fromRow({
                   hash,
                   type,
                   block_height,
                   block_hash,
                   timestamp,
                   version,
                   confirmations,
                   instant_lock,
                   chain_locked,
                   size,
                   inputs,
                   outputs,
                   transfer_amount,
                   coinjoin,
                   multisig,
                   extra_payload
                 }: TransactionRow): Transaction {
    let normalExtraPayload

    let normalVOut: VOut[] | null = null;
    let normalVIn: VIn[] | null = null;

    if (extra_payload != null) {
      const {extraPayload} = extra_payload
      let extraPayloadHandler: Function | undefined = undefined;

      switch (type) {
        case TransactionType.PROVIDER_REGISTRATION:
          extraPayloadHandler = ProRegTX.fromHex
          break
        case TransactionType.PROVIDER_UPDATE_SERVICE:
          extraPayloadHandler = ProUpServTx.fromHex
          break
        case TransactionType.PROVIDER_UPDATE_REGISTRAR:
          extraPayloadHandler = ProUpRegTx.fromHex
          break
        case TransactionType.PROVIDER_UPDATE_REVOCATION:
          extraPayloadHandler = ProUpRevTx.fromHex
          break
        case TransactionType.COINBASE:
          extraPayloadHandler = CbTx.fromHex
          break
        case TransactionType.QUORUM_COMMITMENT:
          extraPayloadHandler = QcTx.fromHex
          break
        case TransactionType.MASTERNODE_HARD_FORK_SIGNAL:
          extraPayloadHandler = MnHfTx.fromHex
          break
        case TransactionType.ASSET_LOCK:
          extraPayloadHandler = AssetLockTx.fromHex
          break
        case TransactionType.ASSET_UNLOCK:
          extraPayloadHandler = AssetUnlockTx.fromHex
          break
      }

      if (extraPayloadHandler != null) {
        normalExtraPayload = extraPayloadHandler(extraPayload)
      }
    }

    if (outputs != null) {
      normalVOut = VOut.fromRows(outputs)
    }

    if (inputs != null) {
      normalVIn = VIn.fromRows(inputs)
    }

    const typeText = type != null ? TransactionType[type] : null;

    return new Transaction(hash, typeText, block_height, block_hash, transfer_amount, version, normalVIn, normalVOut, confirmations, instant_lock, timestamp, chain_locked, size, coinjoin, multisig, normalExtraPayload);
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
                      coinjoin,
                      multisig,
                      extraPayload
                    }: TransactionObject): Transaction {
    let normalVIn: VIn[] | undefined;
    let normalVOut: VOut[] | undefined;

    if (vIn) {
      normalVIn = vIn.map((input) => {
        if (!(input instanceof VIn)) {
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
        if (!(output instanceof VOut)) {
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

    return new Transaction(hash, type, blockHeight, blockHash, amount, version, normalVIn, normalVOut, confirmations, instantLock, timestamp, chainLocked, size, coinjoin, multisig, extraPayload);
  }
}
