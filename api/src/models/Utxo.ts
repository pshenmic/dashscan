import {UtxoObject, UtxoRow} from "../types/utxo";

export default class Utxo {
  prevTxHash: string | null;
  vOutIndex: number | null;
  address: string | null;
  amount: string | null;
  scriptPubKeyHex: string | null;
  blockHeight: number | null;
  confirmations: number | null;
  // Always null: kept so clients written against the previous VIn-shaped
  // response keep parsing.
  sequence: number | null = null;
  scriptSigASM: string | null = null;

  constructor(
    prevTxHash?: string,
    vOutIndex?: number,
    address?: string,
    amount?: string,
    scriptPubKeyHex?: string,
    blockHeight?: number,
    confirmations?: number,
  ) {
    this.prevTxHash = prevTxHash ?? null;
    this.vOutIndex = vOutIndex ?? null;
    this.address = address ?? null;
    this.amount = amount ?? null;
    this.scriptPubKeyHex = scriptPubKeyHex ?? null;
    this.blockHeight = blockHeight ?? null;
    this.confirmations = confirmations ?? null;
  }

  static fromObject({prevTxHash, vOutIndex, address, amount, scriptPubKeyHex, blockHeight, confirmations}: UtxoObject): Utxo {
    return new Utxo(prevTxHash, vOutIndex, address, amount, scriptPubKeyHex, blockHeight, confirmations);
  }

  static fromRow({prev_tx_hash, prev_vout_index, address, amount, script_pub_key, block_height, confirmations}: UtxoRow): Utxo {
    return new Utxo(
      prev_tx_hash,
      prev_vout_index,
      address,
      amount,
      script_pub_key,
      block_height != null ? Number(block_height) : undefined,
      confirmations != null ? Number(confirmations) : undefined,
    );
  }

  static fromRows(rows: UtxoRow[]): Utxo[] {
    return rows.map(Utxo.fromRow);
  }
}