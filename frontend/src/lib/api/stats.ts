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

export function monthStatsRange(): {
  timestampStart: string;
  timestampEnd: string;
} {
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  const end = now.toISOString();
  const start = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  return { timestampStart: start, timestampEnd: end };
}

function buildStatsUrl(path: string, params: FetchStatsInput) {
  const url = new URL(path, getBaseUrl(params.network));
  if (params.timestampStart) {
    url.searchParams.set("timestamp_start", params.timestampStart);
  }
  if (params.timestampEnd) {
    url.searchParams.set("timestamp_end", params.timestampEnd);
  }
  if (params.intervalsCount != null) {
    url.searchParams.set("intervals_count", String(params.intervalsCount));
  }
  return url;
}

async function getTransactionsStats(params: FetchStatsInput) {
  const url = buildStatsUrl("/transactions/chart", params);
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
  const url = buildStatsUrl("/blocks/transactions/chart", params);
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
