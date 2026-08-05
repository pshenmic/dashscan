import Redis from "ioredis";
import GeoIPService from "./services/GeoIPService";

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

export const REDIS_VOTES_KEY_PART = 'dao:votes:'

export const REDIS_AVAILABLE_KEY = 'peers:available';
export const REDIS_UNAVAILABLE_KEY = 'peers:unavailable';
