import type { QueryClient } from "@tanstack/react-query";
import { blocksQueryOptions } from "@/lib/api/blocks";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import {
  marketCapHistoricalQueryOptions,
  marketCapQueryOptions,
} from "@/lib/api/marketcap";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import {
  blockTransactionsStatsQueryOptions,
  dayStatsRange,
} from "@/lib/api/stats";
import {
  volumeHistoricalQueryOptions,
  volumeQueryOptions,
} from "@/lib/api/volume";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";

export function prefetchDashboard(queryClient: QueryClient) {
  const network = defaultNetwork;
  return prefetchSsrData(queryClient, [
    () =>
      queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
      ),
    () => queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
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
    () =>
      queryClient.prefetchQuery(
        volumeQueryOptions({ network, currency: "usd" }),
      ),
    () =>
      queryClient.prefetchQuery(
        volumeHistoricalQueryOptions({ network, currency: "usd" }),
      ),
    () =>
      queryClient.prefetchQuery(
        blockTransactionsStatsQueryOptions({
          network,
          ...dayStatsRange(),
          intervalsCount: 24,
        }),
      ),
  ]);
}
