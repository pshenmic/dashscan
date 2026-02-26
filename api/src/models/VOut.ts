interface VOutObject {
  value?: string;
  number?: number;
  scriptPubKeyASM?: string;
  [key: string]: any;
}

export default class VOut {
  value: string | undefined;
  number: number | undefined;
  scriptPubKeyASM: string | undefined;

  constructor(value?: string, number?: number, scriptPubKeyASM?: string) {
    this.value = value;
    this.number = number;
    this.scriptPubKeyASM = scriptPubKeyASM;
  }

  static fromObject({ value, number, scriptPubKeyASM }: VOutObject): VOut {
    return new VOut(value, number, scriptPubKeyASM);
  }
}
