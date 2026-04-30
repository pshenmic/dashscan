use dashcore::blockdata::script::Script;

const OP_PUSHBYTES_MIN: u8 = 0x01;
const OP_PUSHBYTES_MAX: u8 = 0x4b;
const OP_PUSHDATA1: u8 = 0x4c;
const OP_PUSHDATA2: u8 = 0x4d;
const OP_PUSHDATA4: u8 = 0x4e;
const OP_PUSHBYTES_33: u8 = 0x21;
const OP_PUSHBYTES_65: u8 = 0x41;
const OP_1: u8 = 0x51;
const OP_16: u8 = 0x60;
const OP_CHECKMULTISIG: u8 = 0xae;

pub trait ScriptUtils {
    /// Returns true if the script is a bare multisig pattern
    /// (`OP_M ... OP_N OP_CHECKMULTISIG`) or a P2SH-spending scriptSig
    /// whose last data push is such a redeem script.
    fn is_multisig(&self) -> bool;

    /// Walks the script's pushes and returns the last data push.
    /// For a P2SH-spending `scriptSig`, the last push is the serialized redeem script.
    fn last_data_push(&self) -> Option<&[u8]>;
}

impl ScriptUtils for Script {
    fn is_multisig(&self) -> bool {
        let check_bare = |bytes: &[u8]| -> bool {
            // Bare multisig layout:
            //   OP_<required_sigs> <pubkey>... OP_<pubkey_count> OP_CHECKMULTISIG
            // Smallest valid form (1-of-1 with a 33-byte pubkey) is 37 bytes.
            if bytes.len() < 37 || bytes.last() != Some(&OP_CHECKMULTISIG) {
                return false;
            }

            let required_sigs_op = bytes[0];
            let pubkey_count_op = bytes[bytes.len() - 2];
            if !(OP_1..=OP_16).contains(&required_sigs_op)
                || !(OP_1..=OP_16).contains(&pubkey_count_op)
            {
                return false;
            }

            let required_sigs = (required_sigs_op - OP_1 + 1) as usize;
            let pubkey_count = (pubkey_count_op - OP_1 + 1) as usize;
            if required_sigs > pubkey_count {
                return false;
            }

            let pubkeys_end = bytes.len() - 2;
            let mut pos = 1;
            let mut pubkeys_seen = 0;
            while pos < pubkeys_end {
                let push_len = bytes[pos];
                if push_len != OP_PUSHBYTES_33 && push_len != OP_PUSHBYTES_65 {
                    return false;
                }
                let next = pos + 1 + push_len as usize;
                if next > pubkeys_end {
                    return false;
                }
                pos = next;
                pubkeys_seen += 1;
            }

            pubkeys_seen == pubkey_count
        };

        check_bare(self.as_bytes())
            || self.last_data_push().map(check_bare).unwrap_or(false)
    }

    fn last_data_push(&self) -> Option<&[u8]> {
        let bytes = self.as_bytes();
        let mut pos = 0usize;
        let mut last_push: Option<&[u8]> = None;

        while pos < bytes.len() {
            let opcode = bytes[pos];
            pos += 1;

            let push_len = match opcode {
                OP_PUSHBYTES_MIN..=OP_PUSHBYTES_MAX => opcode as usize,
                OP_PUSHDATA1 => {
                    let len = *bytes.get(pos)? as usize;
                    pos += 1;
                    len
                }
                OP_PUSHDATA2 => {
                    let len_bytes = bytes.get(pos..pos + 2)?;
                    pos += 2;
                    u16::from_le_bytes([len_bytes[0], len_bytes[1]]) as usize
                }
                OP_PUSHDATA4 => {
                    let len_bytes = bytes.get(pos..pos + 4)?;
                    pos += 4;
                    u32::from_le_bytes([len_bytes[0], len_bytes[1], len_bytes[2], len_bytes[3]]) as usize
                }
                _ => continue,
            };

            last_push = Some(bytes.get(pos..pos + push_len)?);
            pos += push_len;
        }

        last_push
    }
}