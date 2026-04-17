// TODO: FIX dashcore-sdk
import {Script} from 'dash-core-sdk/dist/src/types/Script';
import {NETWORK} from "../constants";

interface VOutObject {
  value?: string;
  number?: number;
  scriptPubKeyASM?: string;
  address?: string;
}

interface VOutRow {
  value?: string;
  vout_index?: number;
  script_pub_key?: string;
  address?: string;
}

export default class VOut {
  value?: string;
  number?: number;
  scriptPubKeyASM?: string;
  address?: string;

  constructor(value?: string, number?: number, scriptPubKeyASM?: string, address?: string) {
    this.value = value ?? null;
    this.number = number ?? null;
    this.scriptPubKeyASM = scriptPubKeyASM ?? null;
    this.address = address ?? null;
  }

  static fromObject({ value, number, scriptPubKeyASM, address }: VOutObject): VOut {
    return new VOut(value, number, scriptPubKeyASM, address);
  }

  static fromObjects(obj: VOutObject[]): VOut[] {
    return obj.map(VOut.fromObject);
  }

  static fromRow({ value, vout_index, script_pub_key }: VOutRow): VOut {
    let scriptPubKeyASM: string | null = null;
    let address: string | null = null;

    if(script_pub_key!=null) {
      const script = Script.fromHex(script_pub_key);
      // TODO: FIX dashcore-sdk
      // @ts-ignore
      address = script.getAddress(NETWORK)
      scriptPubKeyASM = script.ASMString()
    }

    return new VOut(value, vout_index, scriptPubKeyASM, address);
  }

  static fromRows(rows: VOutRow[]): VOut[] {
    return rows.map(VOut.fromRow);
  }
}