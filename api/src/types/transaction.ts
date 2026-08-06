export interface VOutObject {
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
}

export interface VOutRow {
  value?: string;
  vout_index?: number;
  script_pub_key?: string;
  script_type?: string;
  address?: string;
  spent_tx_id?: string;
  spent_index?: number;
  spent_height?: number;
}