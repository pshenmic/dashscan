export const NETWORK: "testnet" | "mainnet" = process.env.NETWORK as "testnet" | "mainnet";
// 30 minutes
export const UTXO_INFO_LIFE_TIME = 1000 * 60 * 30;
// 5 minutes
export const PROTX_OUTPOINT_MAP_LIFE_TIME = 1000 * 60 * 5;

export const CONCENTRATION_DECIMALS = 12;

export const SUPERBLOCK_INTERVALS = {
  mainnet: 16616,
  testnet: 24,
  devnet: 24,
  regtest: 20
}

export const GEOIP_PROVIDER = '@ip-location-db/dbip-city-mmdb'
export const GEOIP_TABLE_NAME = 'dbip-city-ipv4.mmdb'

// 3d
export const ADDRESSES_ACTIVITY_LOW_PRECISION_AFTER = 259200000
// 8d
export const ADDRESSES_ACTIVITY_WEEKLY_AFTER = 691200000

export const ADDRESSES_ACTIVITY_WEEKLY_MIN_TX_COUNT = 10
export const ADDRESSES_ACTIVITY_DAILY_MIN_TX_COUNT = 2

export const SCRIPT_TYPE_MULTISIG = 'multisig'
export const PUBKEY_PUSH_OPCODES = [33, 65]

export const REDIS_VOTES_KEY_PART = 'dao:votes:'

export const REDIS_AVAILABLE_KEY = 'peers:available';
export const REDIS_UNAVAILABLE_KEY = 'peers:unavailable';

// Dash reuses Bitcoin's extended-key version bytes: xprv/xpub on mainnet,
// tprv/tpub on testnet. Checking them rejects a key from the wrong network,
// which would otherwise derive addresses that can never match this index.
export const XPUB_VERSIONS = {
  mainnet: { private: 0x0488ade4, public: 0x0488b21e },
  testnet: { private: 0x04358394, public: 0x043587cf },
};

// BIP44 fixes this level to two values: 0 external (receive), 1 internal
// (change). Named branches, not chains, because `chain` means the blockchain
// everywhere else here.
export const XPUB_BRANCHES = [0, 1];
export const XPUB_DEFAULT_GAP_LIMIT = 20;
// Safety valve, not DoS protection: an unused key stops after gap_limit
// derivations regardless, so this only ever binds on real wallets. Reaching it
// truncates the scan, which the response reports as complete: false.
export const XPUB_MAX_ADDRESSES_PER_BRANCH = 5000;
// Addresses derived per round trip. Independent of gap_limit, which would
// otherwise make a 5000-address wallet take 250 sequential queries at gap 20.
export const XPUB_DERIVATION_BATCH_SIZE = 100;
// 1h
export const XPUB_CACHE_LIFE_TIME = 1000 * 60 * 60;
