import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { paginationSearchSchema } from "@/lib/pagination";
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
