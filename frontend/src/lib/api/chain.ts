import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { ApiChainStats } from "./types";

interface FetchChainStatsInput {
  network: Network;
}

async function getChainStats(params: FetchChainStatsInput) {
  const url = new URL("/chain/stats", getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiChainStats>;
}

export const fetchChainStats = createServerFn({ method: "POST" })
  .inputValidator((input: FetchChainStatsInput) => input)
  .handler(({ data }) => getChainStats(data));

export function chainStatsQueryOptions(params: FetchChainStatsInput) {
  return queryOptions({
    queryKey: ["chainStats", params.network],
    queryFn: () => getChainStats(params),
  });
}
