import { Store } from "@tanstack/store";

export type Network = "mainnet" | "testnet";

export const appStore = new Store({ network: "testnet" as Network });
