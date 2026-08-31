import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { masternodesInfiniteQueryOptions } from "@/lib/api/masternodes";
import { paginationSearchSchema } from "@/lib/pagination";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignMasternodesListPage from "@/themes/neo/pages/masternodes-list";

const ClassicMasternodesListPage = lazy(
  () => import("@/themes/dash/pages/masternodes-list"),
);

export const Route = createFileRoute("/masternodes/")({
  validateSearch: paginationSearchSchema,
  component: MasternodesListRoute,
  head: () => ({
    meta: [{ title: "Masternodes | Dashscan" }],
  }),
  loader: ({ context }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchInfiniteQuery(
          masternodesInfiniteQueryOptions({
            network: defaultNetwork,
            limit: 25,
            order: "desc",
          }),
        ),
    ]),
});

function MasternodesListRoute() {
  const theme = useActiveTheme();
  const { page, limit } = Route.useSearch();
  if (theme === "neo") return <RedesignMasternodesListPage />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicMasternodesListPage page={page} limit={limit} />
    </Suspense>
  );
}
