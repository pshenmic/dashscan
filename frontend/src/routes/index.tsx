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
import { prefetchSsrData } from "@/lib/ssr-prefetch";
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
  loader: ({ context }) => {
    const network = defaultNetwork;
    return prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchQuery(
          blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
        ),
      () =>
        context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
      () =>
        context.queryClient.prefetchQuery(
          priceQueryOptions({ network, currency: "usd" }),
        ),
      () =>
        context.queryClient.prefetchQuery(
          priceHistoricalQueryOptions({ network, currency: "usd" }),
        ),
      () =>
        context.queryClient.prefetchQuery(
          marketCapQueryOptions({ network, currency: "usd" }),
        ),
      () =>
        context.queryClient.prefetchQuery(
          marketCapHistoricalQueryOptions({ network, currency: "usd" }),
        ),
      () =>
        context.queryClient.prefetchQuery(
          volumeQueryOptions({ network, currency: "usd" }),
        ),
      () =>
        context.queryClient.prefetchQuery(
          volumeHistoricalQueryOptions({ network, currency: "usd" }),
        ),
      () =>
        context.queryClient.prefetchQuery(
          blockTransactionsStatsQueryOptions({
            network,
            ...dayStatsRange(),
            intervalsCount: 24,
          }),
        ),
    ]);
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
