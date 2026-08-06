// TODO: FIX dashcore-sdk
import {Script} from 'dash-core-sdk';
import {NETWORK, SCRIPT_TYPE_MULTISIG} from "../constants";
import {VOutObject, VOutRow} from "../types/transaction";
import {multisigAddresses} from "../utils";

export default class VOut {
  value?: string;
  number?: number;
  scriptPubKeyASM?: string;
  scriptPubKeyHex?: string;
  scriptPubKeyType?: string;
  address?: string;
  addresses?: string[];
  spentTxId?: string;
  spentIndex?: number;
  spentHeight?: number;

  constructor(
    value?: string,
    number?: number,
    scriptPubKeyASM?: string,
    address?: string,
    scriptPubKeyHex?: string,
    scriptPubKeyType?: string,
    addresses?: string[],
    spentTxId?: string,
    spentIndex?: number,
    spentHeight?: number,
  ) {
    this.value = value ?? null;
    this.number = number ?? null;
    this.scriptPubKeyASM = scriptPubKeyASM ?? null;
    this.scriptPubKeyHex = scriptPubKeyHex ?? null;
    this.scriptPubKeyType = scriptPubKeyType ?? null;
    this.address = address ?? null;
    this.addresses = addresses ?? null;
    this.spentTxId = spentTxId ?? null;
    this.spentIndex = spentIndex ?? null;
    this.spentHeight = spentHeight ?? null;
  }

  static fromObject({ value, number, scriptPubKeyASM, scriptPubKeyHex, scriptPubKeyType, address, addresses, spentTxId, spentIndex, spentHeight }: VOutObject): VOut {
    return new VOut(value, number, scriptPubKeyASM, address, scriptPubKeyHex, scriptPubKeyType, addresses, spentTxId, spentIndex, spentHeight);
  }

  static fromObjects(obj: VOutObject[]): VOut[] {
    return obj.map(VOut.fromObject);
  }

  static fromRow({ value, vout_index, script_pub_key, script_type, address, spent_tx_id, spent_index, spent_height }: VOutRow): VOut {
    let scriptPubKeyASM: string | null = null;
    let resolvedAddress: string | null = address ?? null;
    let addresses: string[] | null = address != null ? [address] : null;

    if(script_pub_key!=null) {
      const script = Script.fromHex(script_pub_key);

      if (resolvedAddress == null) {
        // TODO: FIX dashcore-sdk
        // @ts-ignore
        resolvedAddress = script.getAddress(NETWORK)
      }

      scriptPubKeyASM = script.ASMString()

      if (script_type === SCRIPT_TYPE_MULTISIG) {
        addresses = multisigAddresses(script_pub_key)
      } else if (addresses == null && resolvedAddress != null) {
        addresses = [resolvedAddress]
      }
    }

    return new VOut(
      value,
      vout_index,
      scriptPubKeyASM,
      resolvedAddress,
      script_pub_key,
      script_type,
      addresses,
      spent_tx_id,
      spent_index,
      spent_height,
    );
  }

  static fromRows(rows: VOutRow[]): VOut[] {
    return rows.map(VOut.fromRow);
  }
}