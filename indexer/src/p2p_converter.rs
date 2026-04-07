use dashcore::address::Address;
use dashcore::blockdata::transaction::special_transaction::TransactionPayload;
use dashcore::consensus::encode;
use dashcore::Network;

use crate::rpc::{Block, CbTx, ScriptPubKey, ScriptSig, Transaction, Vin, Vout};

pub fn convert_block(
    raw: &dashcore::block::Block,
    height: i64,
    network: Network,
) -> Block {
    let header = &raw.header;
    let hash_str = header.block_hash().to_string();
    let prev = header.prev_blockhash.to_string();
    let prev_hash = if prev.chars().all(|c| c == '0') {
        None
    } else {
        Some(prev)
    };

    let cb_tx = extract_cbtx(raw);

    let tx: Vec<Transaction> = raw
        .txdata
        .iter()
        .map(|t| convert_transaction(t, network))
        .collect();

    Block {
        hash: hash_str,
        height,
        time: header.time as i64,
        version: header.version.to_consensus(),
        previous_block_hash: prev_hash,
        merkle_root: header.merkle_root.to_string(),
        size: raw.size() as i64,
        nonce: header.nonce as i64,
        difficulty: header.difficulty_float(),
        chainwork: String::new(),
        tx,
        cb_tx,
    }
}

pub fn convert_transaction(
    tx: &dashcore::blockdata::transaction::Transaction,
    network: Network,
) -> Transaction {
    let txid = tx.txid().to_string();
    let tx_type_val = tx.tx_type() as i16;

    let vin: Vec<Vin> = tx
        .input
        .iter()
        .enumerate()
        .map(|(i, input)| {
            if tx.is_coin_base() && i == 0 {
                Vin {
                    txid: None,
                    vout: None,
                    coinbase: Some(hex::encode(input.script_sig.as_bytes())),
                    script_sig: None,
                }
            } else {
                Vin {
                    txid: Some(input.previous_output.txid.to_string()),
                    vout: Some(input.previous_output.vout as i32),
                    coinbase: None,
                    script_sig: Some(ScriptSig {
                        asm: format!("{}", input.script_sig.as_script()),
                        hex: hex::encode(input.script_sig.as_bytes()),
                    }),
                }
            }
        })
        .collect();

    let vout: Vec<Vout> = tx
        .output
        .iter()
        .enumerate()
        .map(|(n, output)| {
            let address = Address::from_script(&output.script_pubkey, network)
                .ok()
                .map(|a| a.to_string());

            let script_type = if output.script_pubkey.is_p2pkh() {
                Some("pubkeyhash".to_string())
            } else if output.script_pubkey.is_p2sh() {
                Some("scripthash".to_string())
            } else if output.script_pubkey.is_op_return() {
                Some("nulldata".to_string())
            } else {
                Some("nonstandard".to_string())
            };

            Vout {
                value: output.value as f64 / 100_000_000.0,
                n: n as i32,
                script_pub_key: ScriptPubKey {
                    asm: format!("{}", output.script_pubkey.as_script()),
                    hex: Some(hex::encode(output.script_pubkey.as_bytes())),
                    script_type,
                    addresses: None,
                    address,
                },
            }
        })
        .collect();

    let extra_payload = tx
        .special_transaction_payload
        .as_ref()
        .map(|p| hex::encode(encode::serialize(p)));

    let extra_payload_size = tx
        .special_transaction_payload
        .as_ref()
        .map(|p| p.len() as i32);

    Transaction {
        txid,
        version: tx.version as i32,
        tx_type: if tx_type_val > 0 {
            Some(tx_type_val)
        } else {
            None
        },
        size: tx.size() as i64,
        locktime: tx.lock_time as i64,
        vin,
        vout,
        extra_payload_size,
        extra_payload,
        extra: serde_json::Map::new(),
    }
}

fn extract_cbtx(block: &dashcore::block::Block) -> Option<CbTx> {
    let coinbase = block.coinbase()?;
    let payload = coinbase.special_transaction_payload.as_ref()?;

    if let TransactionPayload::CoinbasePayloadType(cb) = payload {
        Some(CbTx {
            version: cb.version as i32,
            height: cb.height as i32,
            merkle_root_mn_list: cb.merkle_root_masternode_list.to_string(),
            merkle_root_quorums: if cb.version >= 2 {
                Some(cb.merkle_root_quorums.to_string())
            } else {
                None
            },
            best_cl_height_diff: cb.best_cl_height.map(|h| h as i64),
            best_cl_signature: cb.best_cl_signature.map(|s| format!("{}", s)),
            credit_pool_balance: cb
                .asset_locked_amount
                .map(|a| a as f64 / 100_000_000.0),
        })
    } else {
        None
    }
}