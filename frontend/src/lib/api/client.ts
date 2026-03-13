import type { Network } from "@/lib/store";

export function getBaseUrl(_network: Network): string {
  return (
    process.env.DASHSCAN_API_URL ?? "https://testnet.dashscan.pshenmic.dev"
  );
}
