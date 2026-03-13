import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { ApiHistoricalEntry } from "./types";

interface FetchMarketCapInput {
  network: Network;
  currency: "usd" | "btc";
}

async function getMarketCap(params: FetchMarketCapInput) {
  const url = new URL(
    `/marketcap/${params.currency}`,
    getBaseUrl(params.network),
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<Record<string, number>>;
}

export const fetchMarketCap = createServerFn({ method: "POST" })
  .inputValidator((input: FetchMarketCapInput) => input)
  .handler(({ data }) => getMarketCap(data));

export function marketCapQueryOptions(params: FetchMarketCapInput) {
  return queryOptions({
    queryKey: ["marketcap", params.network, params.currency],
    queryFn: () => getMarketCap(params),
  });
}

async function getMarketCapHistorical(params: FetchMarketCapInput) {
  const url = new URL(
    `/marketcap/${params.currency}/historical`,
    getBaseUrl(params.network),
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiHistoricalEntry[]>;
}

export const fetchMarketCapHistorical = createServerFn({ method: "POST" })
  .inputValidator((input: FetchMarketCapInput) => input)
  .handler(({ data }) => getMarketCapHistorical(data));

export function marketCapHistoricalQueryOptions(params: FetchMarketCapInput) {
  return queryOptions({
    queryKey: ["marketcapHistorical", params.network, params.currency],
    queryFn: () => getMarketCapHistorical(params),
  });
}
