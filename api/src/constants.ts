export const NETWORK: "testnet" | "mainnet" = process.env.NETWORK as "testnet" | "mainnet";
// 30 minutes
export const UTXO_INFO_LIFE_TIME = 1000 * 60 * 30;

export const CONCENTRATION_DECIMALS = 12;

export const SUPERBLOCK_INTERVALS = {
  mainnet: 16616,
  testnet: 24,
  devnet: 24,
  regtest: 20
}

export const GEOIP_PROVIDER = '@ip-location-db/geo-whois-asn-country'
export const GEOIP_TABLE_NAME = 'geo-whois-asn-country-ipv4-num.csv'