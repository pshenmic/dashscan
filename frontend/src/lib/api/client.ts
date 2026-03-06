import type { Network } from "@/lib/store";

const BASE_URLS: Record<Network, string> = {
  mainnet: "https://dashscan.pshenmic.dev",
  testnet: "https://testnet.dashscan.pshenmic.dev",
};

export function getBaseUrl(network: Network): string {
  return BASE_URLS[network];
}
