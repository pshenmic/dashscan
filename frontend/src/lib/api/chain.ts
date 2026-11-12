import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { apiFetch, getBaseUrl } from "./client";
import type { ApiChainStats } from "./types";

export function supplyQueryOptions({ network }: { network: Network }) {
  return queryOptions({
    queryKey: ["supply", network],
    queryFn: async ({ signal }): Promise<{ totalSupply: string } | null> => {
      const response = await apiFetch(new URL("/supply", getBaseUrl(network)), {
        signal,
      });
      if (response.status === 404) return null;
      if (!response.ok)
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      return response.json();
    },
    staleTime: 30 * 60_000,
  });
}

interface FetchChainStatsInput {
  network: Network;
}

async function getChainStats(params: FetchChainStatsInput) {
  const url = new URL("/chain/stats", getBaseUrl(params.network));
  const response = await apiFetch(url);
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
