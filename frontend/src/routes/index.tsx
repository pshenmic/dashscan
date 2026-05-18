import { createFileRoute } from "@tanstack/react-router";
import { richListQueryOptions } from "@/lib/api/addresses";
import { blocksQueryOptions } from "@/lib/api/blocks";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import {
  budgetQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import {
  marketCapHistoricalQueryOptions,
  marketCapQueryOptions,
} from "@/lib/api/marketcap";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import { mempoolQueryOptions } from "@/lib/api/mempool";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import {
  blockTransactionsStatsQueryOptions,
  monthStatsRange,
  transactionsBreakdown24hQueryOptions,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import {
  volumeHistoricalQueryOptions,
  volumeQueryOptions,
} from "@/lib/api/volume";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicDashboardPage from "@/themes/dash/pages/dashboard";
import RedesignDashboardPage from "@/themes/neo/pages/dashboard";

function dayStatsRange() {
  const end = new Date();
  end.setUTCMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    timestampStart: start.toISOString(),
    timestampEnd: end.toISOString(),
  };
}

export const Route = createFileRoute("/")({
  component: DashboardRoute,
  head: () => ({
    meta: [{ title: "Dashboard | Dashscan" }],
  }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({
          network,
          page: 1,
          limit: 10,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page: 1, limit: 50 }),
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
        volumeQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        volumeHistoricalQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsStatsQueryOptions({
          network,
          ...monthStatsRange(),
          intervalsCount: 30,
        }),
      ),
      context.queryClient.prefetchQuery(
        blockTransactionsStatsQueryOptions({
          network,
          ...dayStatsRange(),
          intervalsCount: 24,
        }),
      ),
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
      context.queryClient.prefetchQuery(budgetQueryOptions({ network })),
      context.queryClient.prefetchQuery(proposalsQueryOptions({ network })),
      context.queryClient.prefetchQuery(
        mempoolQueryOptions({ network, page: 1, limit: 1 }),
      ),
      context.queryClient.prefetchQuery(
        richListQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsBreakdown24hQueryOptions({ network }),
      ),
    ]);
  },
});

function DashboardRoute() {
  const theme = useActiveTheme();
  if (theme === "neo") return <RedesignDashboardPage />;
  return <ClassicDashboardPage />;
}
