import { useCallback, useEffect, useState } from "react";
import type { Network } from "@/lib/store";

export type SearchKind = "block" | "transaction" | "masternode" | "address";
export type SearchEntry = {
  kind: SearchKind;
  id: string;
  label: string;
  network: Network;
};

const storageKey = "dashscan:recent-searches:v1";
const addressPatterns = {
  mainnet: /^[X7][1-9A-HJ-NP-Za-km-z]{25,33}$/,
  testnet: /^[y8][1-9A-HJ-NP-Za-km-z]{25,33}$/,
};
const hashPattern = /^[0-9a-fA-F]{64}$/;
const paths = {
  block: "blocks",
  transaction: "transactions",
  masternode: "masternodes",
  address: "address",
};

export function searchPath(entry: SearchEntry) {
  return `/${paths[entry.kind]}/${encodeURIComponent(entry.id)}`;
}

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

type History = { enabled: boolean; entries: SearchEntry[] };

function validEntry(value: unknown): value is SearchEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as SearchEntry;
  if (entry.network !== "mainnet" && entry.network !== "testnet") return false;
  if (
    typeof entry.id !== "string" ||
    typeof entry.label !== "string" ||
    entry.label.length > 200
  )
    return false;
  if (entry.kind === "address")
    return addressPatterns[entry.network].test(entry.id);
  return (
    ["block", "transaction", "masternode"].includes(entry.kind) &&
    hashPattern.test(entry.id)
  );
}

function readHistory(): History {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return { enabled: true, entries: [] };
  try {
    const value = JSON.parse(stored);
    const enabled = value?.enabled !== false;
    return {
      enabled,
      entries:
        enabled && Array.isArray(value?.entries)
          ? value.entries.filter(validEntry).slice(0, 10)
          : [],
    };
  } catch {
    return { enabled: true, entries: [] };
  }
}

export function useSearchHistory(network: Network) {
  const [history, setHistory] = useState<History>({
    enabled: false,
    entries: [],
  });
  const [available, setAvailable] = useState(false);

  const reload = useCallback(() => {
    try {
      setHistory(readHistory());
      setAvailable(true);
    } catch {
      setHistory({ enabled: false, entries: [] });
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reload]);

  function update(transform: (current: History) => History) {
    try {
      const next = transform(readHistory());
      localStorage.setItem(storageKey, JSON.stringify(next));
      setHistory(next);
      setAvailable(true);
    } catch {
      setAvailable(false);
    }
  }

  return {
    available,
    enabled: available && history.enabled,
    entries:
      available && history.enabled
        ? history.entries
            .filter((entry) => entry.network === network)
            .slice(0, 5)
        : [],
    reload,
    remember: (entry: SearchEntry) =>
      update((current) => {
        if (!current.enabled) return current;
        const recent = current.entries.filter(
          (item) =>
            item.network === network &&
            !(item.kind === entry.kind && item.id === entry.id),
        );
        return {
          ...current,
          entries: [entry, ...recent]
            .slice(0, 5)
            .concat(current.entries.filter((item) => item.network !== network)),
        };
      }),
    remove: (entry: SearchEntry) =>
      update((current) => ({
        ...current,
        entries: current.entries.filter(
          (item) =>
            !(
              item.network === entry.network &&
              item.kind === entry.kind &&
              item.id === entry.id
            ),
        ),
      })),
    clear: () =>
      update((current) => ({
        ...current,
        entries: current.entries.filter((entry) => entry.network !== network),
      })),
    toggle: () =>
      update((current) => ({ enabled: !current.enabled, entries: [] })),
  };
}
