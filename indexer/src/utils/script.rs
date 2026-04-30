use dashcore::blockdata::script::Script;

const OP_CHECKMULTISIG: u8 = 0xae;
const OP_1: u8 = 0x51;
const OP_16: u8 = 0x60;
const OP_PUSHBYTES_33: u8 = 0x21;
const OP_PUSHBYTES_65: u8 = 0x41;

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
            // minimum: OP_1 <33-byte pubkey> OP_1 OP_CHECKMULTISIG
            if bytes.len() < 37 {
                return false;
            }
            if *bytes.last().unwrap() != OP_CHECKMULTISIG {
                return false;
            }

            let m_op = bytes[0];
            let n_op = bytes[bytes.len() - 2];
            if !(OP_1..=OP_16).contains(&m_op) || !(OP_1..=OP_16).contains(&n_op) {
                return false;
            }

            let m = (m_op - OP_1 + 1) as usize;
            let n = (n_op - OP_1 + 1) as usize;
            if m == 0 || m > n || n > 16 {
                return false;
            }

            let mut i = 1;
            let end = bytes.len() - 2;
            let mut count = 0;
            while i < end {
                let push_len = bytes[i] as usize;
                if push_len != OP_PUSHBYTES_33 as usize && push_len != OP_PUSHBYTES_65 as usize {
                    return false;
                }
                if i + 1 + push_len > end {
                    return false;
                }
                i += 1 + push_len;
                count += 1;
            }

            count == n
        };

        check_bare(self.as_bytes())
            || self.last_data_push().map(check_bare).unwrap_or(false)
    }

    fn last_data_push(&self) -> Option<&[u8]> {
        let bytes = self.as_bytes();
        let mut i = 0usize;
        let mut last: Option<&[u8]> = None;

        while i < bytes.len() {
            let op = bytes[i];
            i += 1;

            let len = if (0x01..=0x4b).contains(&op) {
                op as usize
            } else if op == 0x4c {
                if i >= bytes.len() { return None; }
                let l = bytes[i] as usize;
                i += 1;
                l
            } else if op == 0x4d {
                if i + 2 > bytes.len() { return None; }
                let l = u16::from_le_bytes([bytes[i], bytes[i + 1]]) as usize;
                i += 2;
                l
            } else if op == 0x4e {
                if i + 4 > bytes.len() { return None; }
                let l = u32::from_le_bytes([bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]]) as usize;
                i += 4;
                l
            } else {
                continue;
            };

            if i + len > bytes.len() { return None; }
            last = Some(&bytes[i..i + len]);
            i += len;
        }

        last
    }
}