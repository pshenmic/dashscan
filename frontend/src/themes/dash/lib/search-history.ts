import type { Network } from "@/lib/store";

const addressPatterns = {
  mainnet: /^[X7][1-9A-HJ-NP-Za-km-z]{25,33}$/,
  testnet: /^[y8][1-9A-HJ-NP-Za-km-z]{25,33}$/,
};
const hashPattern = /^[0-9a-fA-F]{64}$/;

export function searchHint(query: string, network: Network): string | null {
  if (!query)
    return "Enter an address, transaction hash, block hash or height, or masternode ProTxHash.";
  if (/^\d+$/.test(query)) {
    return Number.isSafeInteger(Number(query))
      ? null
      : "Enter a valid block height.";
  }
  if (hashPattern.test(query) || addressPatterns[network].test(query))
    return null;
  const otherNetwork = network === "mainnet" ? "testnet" : "mainnet";
  if (addressPatterns[otherNetwork].test(query)) {
    return `This looks like a ${otherNetwork} address. Switch networks to search for it.`;
  }
  if (/^[0-9a-fA-F]{1,63}$/.test(query))
    return "Enter the complete 64-character hash.";
  if (/^[X7y8][1-9A-HJ-NP-Za-km-z]{0,24}$/.test(query))
    return "Enter the complete Dash address.";
  return "Use a Dash address, a 64-character hash or a numeric block height.";
}
