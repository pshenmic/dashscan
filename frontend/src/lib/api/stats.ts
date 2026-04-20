import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type {
  ApiBlockTransactionsStatsEntry,
  ApiTransactionsStatsEntry,
} from "./types";

interface FetchStatsInput {
  network: Network;
}

async function getTransactionsStats(params: FetchStatsInput) {
  const url = new URL("/transactions/stats", getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiTransactionsStatsEntry[]>;
}

export const fetchTransactionsStats = createServerFn({ method: "POST" })
  .inputValidator((input: FetchStatsInput) => input)
  .handler(({ data }) => getTransactionsStats(data));

export function transactionsStatsQueryOptions(params: FetchStatsInput) {
  return queryOptions({
    queryKey: ["transactionsStats", params.network],
    queryFn: () => getTransactionsStats(params),
  });
}

async function getBlockTransactionsStats(params: FetchStatsInput) {
  const url = new URL("/blocks/transactions/stats", getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiBlockTransactionsStatsEntry[]>;
}

export const fetchBlockTransactionsStats = createServerFn({ method: "POST" })
  .inputValidator((input: FetchStatsInput) => input)
  .handler(({ data }) => getBlockTransactionsStats(data));

export function blockTransactionsStatsQueryOptions(params: FetchStatsInput) {
  return queryOptions({
    queryKey: ["blockTransactionsStats", params.network],
    queryFn: () => getBlockTransactionsStats(params),
  });
}
