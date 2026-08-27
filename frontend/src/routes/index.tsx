import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
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
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignDashboardPage from "@/themes/neo/pages/dashboard";

const ClassicDashboardPage = lazy(
  () => import("@/themes/dash/pages/dashboard"),
);

export const Route = createFileRoute("/")({
  component: DashboardRoute,
  head: () => ({
    meta: [{ title: "Dashboard | Dashscan" }],
  }),
  loader: async ({ context }) => {
    if (typeof window !== "undefined") return;

    const network = defaultNetwork;
    const criticalQueries = [
      blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
      chainStatsQueryOptions({ network }),
      priceQueryOptions({ network, currency: "usd" }),
      priceHistoricalQueryOptions({ network, currency: "usd" }),
      marketCapQueryOptions({ network, currency: "usd" }),
      marketCapHistoricalQueryOptions({ network, currency: "usd" }),
      volumeQueryOptions({ network, currency: "usd" }),
      volumeHistoricalQueryOptions({ network, currency: "usd" }),
      blockTransactionsStatsQueryOptions({
        network,
        ...dayStatsRange(),
        intervalsCount: 24,
      }),
    ];

    await Promise.allSettled(
      criticalQueries.map((query) => context.queryClient.prefetchQuery(query)),
    );
  },
});

function DashboardRoute() {
  const theme = useActiveTheme();
  if (theme === "neo") return <RedesignDashboardPage />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicDashboardPage />
    </Suspense>
  );
}
