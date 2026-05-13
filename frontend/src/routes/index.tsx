import { createFileRoute } from "@tanstack/react-router";
import { blocksQueryOptions } from "@/lib/api/blocks";
import {
  marketCapHistoricalQueryOptions,
  marketCapQueryOptions,
} from "@/lib/api/marketcap";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import {
  blockTransactionsStatsQueryOptions,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { volumeHistoricalQueryOptions } from "@/lib/api/volume";
import { defaultNetwork } from "@/lib/store";
import ClassicDashboardPage from "@/themes/classic/pages/dashboard";

export const Route = createFileRoute("/")({
  component: DashboardRoute,
  head: () => ({
    meta: [{ title: "Dashboard | DashScan" }],
  }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 5, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({ network, page: 1, limit: 4, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page: 1, limit: 5, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsStatsQueryOptions({ network }),
      ),
      context.queryClient.prefetchQuery(
        blockTransactionsStatsQueryOptions({ network }),
      ),
      context.queryClient.prefetchQuery(
        priceQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        priceQueryOptions({ network, currency: "btc" }),
      ),
      context.queryClient.prefetchQuery(
        priceHistoricalQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        marketCapQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        marketCapHistoricalQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        volumeHistoricalQueryOptions({ network, currency: "usd" }),
      ),
    ]);
  },
});

function DashboardRoute() {
  return <ClassicDashboardPage />;
}
