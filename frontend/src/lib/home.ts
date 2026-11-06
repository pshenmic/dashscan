import type { QueryClient } from "@tanstack/react-query";
import { blocksQueryOptions } from "./api/blocks";
import { chainStatsQueryOptions } from "./api/chain";
import {
  marketCapHistoricalQueryOptions,
  marketCapQueryOptions,
} from "./api/marketcap";
import { priceHistoricalQueryOptions, priceQueryOptions } from "./api/price";
import { prefetchSsrData } from "./ssr-prefetch";
import { defaultNetwork, type Network } from "./store";

export function homeBlocksQueryOptions(network: Network) {
  return {
    ...blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
    refetchInterval: 30_000,
  };
}

export function homeChainQueryOptions(network: Network) {
  return {
    ...chainStatsQueryOptions({ network }),
    refetchInterval: 30_000,
  };
}

export function prefetchHome(queryClient: QueryClient) {
  const network = defaultNetwork;
  return prefetchSsrData(queryClient, [
    () => queryClient.prefetchQuery(homeBlocksQueryOptions(network)),
    () => queryClient.prefetchQuery(homeChainQueryOptions(network)),
    () =>
      queryClient.prefetchQuery(
        priceQueryOptions({ network, currency: "usd" }),
      ),
    () =>
      queryClient.prefetchQuery(
        priceHistoricalQueryOptions({ network, currency: "usd" }),
      ),
    () =>
      queryClient.prefetchQuery(
        marketCapQueryOptions({ network, currency: "usd" }),
      ),
    () =>
      queryClient.prefetchQuery(
        marketCapHistoricalQueryOptions({ network, currency: "usd" }),
      ),
  ]);
}
