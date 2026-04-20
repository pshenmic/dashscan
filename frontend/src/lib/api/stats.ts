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
  timestampStart?: string;
  timestampEnd?: string;
  intervalsCount?: number;
}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function resolveRange(params: FetchStatsInput) {
  const end = params.timestampEnd ?? new Date().toISOString();
  const start =
    params.timestampStart ??
    new Date(new Date(end).getTime() - ONE_MONTH_MS).toISOString();
  return { start, end };
}

function buildStatsUrl(path: string, params: FetchStatsInput) {
  const url = new URL(path, getBaseUrl(params.network));
  const { start, end } = resolveRange(params);
  url.searchParams.set("timestamp_start", start);
  url.searchParams.set("timestamp_end", end);
  if (params.intervalsCount != null) {
    url.searchParams.set("intervals_count", String(params.intervalsCount));
  }
  return url;
}

async function getTransactionsStats(params: FetchStatsInput) {
  const url = buildStatsUrl("/transactions/stats", params);
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
    queryKey: [
      "transactionsStats",
      params.network,
      params.timestampStart ?? null,
      params.timestampEnd ?? null,
      params.intervalsCount ?? null,
    ],
    queryFn: () => getTransactionsStats(params),
  });
}

async function getBlockTransactionsStats(params: FetchStatsInput) {
  const url = buildStatsUrl("/blocks/transactions/stats", params);
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
    queryKey: [
      "blockTransactionsStats",
      params.network,
      params.timestampStart ?? null,
      params.timestampEnd ?? null,
      params.intervalsCount ?? null,
    ],
    queryFn: () => getBlockTransactionsStats(params),
  });
}
