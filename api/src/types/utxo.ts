export interface UtxoObject {
  prevTxHash?: string;
  vOutIndex?: number;
  address?: string;
  amount?: string;
  scriptPubKeyHex?: string;
  blockHeight?: number;
  confirmations?: number;
}

export interface UtxoRow {
  prev_tx_hash?: string;
  prev_vout_index?: number;
  address?: string;
  amount?: string;
  script_pub_key?: string;
  block_height?: number;
  confirmations?: number;
}