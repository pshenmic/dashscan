import { Store } from "@tanstack/store";

export type Network = "mainnet" | "testnet";

export const defaultNetwork: Network =
  (process.env.NETWORK as Network) || "testnet";

export const appStore = new Store({ network: defaultNetwork });
