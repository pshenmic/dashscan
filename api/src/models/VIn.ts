interface VInObject {
  txId?: string;
  vOut?: number;
  sequence?: number;
  scriptSigASM?: string;
}

export default class VIn {
  txId: string | null;
  vOut: number | null;
  sequence: number | null;
  scriptSigASM: string | null;

  constructor(txId?: string, vOut?: number, sequence?: number, scriptSigASM?: string) {
    this.txId = txId ?? null;
    this.vOut = vOut ?? null;
    this.sequence = sequence ?? null;
    this.scriptSigASM = scriptSigASM ?? null;
  }

  static fromObject({ txId, vOut, sequence, scriptSigASM }: VInObject): VIn {
    return new VIn(txId, vOut, sequence, scriptSigASM);
  }
}
