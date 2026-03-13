import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { ApiHistoricalEntry } from "./types";

type Currency = "usd" | "btc";

interface FetchPriceInput {
  network: Network;
  currency: Currency;
}

async function getPrice(params: FetchPriceInput) {
  const url = new URL(`/price/${params.currency}`, getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<Record<string, number>>;
}

export const fetchPrice = createServerFn({ method: "POST" })
  .inputValidator((input: FetchPriceInput) => input)
  .handler(({ data }) => getPrice(data));

export function priceQueryOptions(params: FetchPriceInput) {
  return queryOptions({
    queryKey: ["price", params.network, params.currency],
    queryFn: () => getPrice(params),
  });
}

async function getPriceHistorical(params: FetchPriceInput) {
  const url = new URL(
    `/price/${params.currency}/historical`,
    getBaseUrl(params.network),
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiHistoricalEntry[]>;
}

export const fetchPriceHistorical = createServerFn({ method: "POST" })
  .inputValidator((input: FetchPriceInput) => input)
  .handler(({ data }) => getPriceHistorical(data));

export function priceHistoricalQueryOptions(params: FetchPriceInput) {
  return queryOptions({
    queryKey: ["priceHistorical", params.network, params.currency],
    queryFn: () => getPriceHistorical(params),
  });
}
