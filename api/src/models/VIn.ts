interface VInObject {
  sequence?: number;
  scriptSigASM?: string;
  prevTxHash?: string;
  vOutIndex?: number;
  address?: string;
  amount?: string;
}

interface VInRow {
  prev_tx_hash?: string;
  prev_vout_index?: number;
  address?: string;
  amount: string;
}

export default class VIn {
  sequence: number | null;
  scriptSigASM: string | null;
  prevTxHash: string | null;
  vOutIndex: number | null;
  address: string | null;
  amount: string | null;

  constructor(sequence?: number, scriptSigASM?: string, prevTxHash?: string, vOutIndex?: number, address?: string, amount?: string) {
    this.sequence = sequence ?? null;
    this.scriptSigASM = scriptSigASM ?? null;
    this.prevTxHash = prevTxHash ?? null;
    this.vOutIndex = vOutIndex ?? null;
    this.address = address ?? null;
    this.amount = amount ?? null;
  }

  static fromObject({sequence, scriptSigASM, prevTxHash, vOutIndex, address, amount }: VInObject): VIn {
    return new VIn(sequence, scriptSigASM, prevTxHash, vOutIndex, address, amount);
  }

  static fromObjects(obj: VInObject[]): VIn[] {
    return obj.map(VIn.fromObject);
  }

  static fromRow({prev_tx_hash, prev_vout_index, address, amount }: VInRow): VIn {
    return new VIn(undefined, undefined, prev_tx_hash, prev_vout_index, address, amount);
  }

  static fromRows(rows: VInRow[]): VIn[] {
    return rows.map(VIn.fromRow);
  }
}