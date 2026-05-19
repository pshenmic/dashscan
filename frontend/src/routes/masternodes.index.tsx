import { createFileRoute } from "@tanstack/react-router";
import {
  masternodesInfiniteQueryOptions,
  masternodesQueryOptions,
} from "@/lib/api/masternodes";
import { paginationSearchSchema } from "@/lib/pagination";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicMasternodesListPage from "@/themes/dash/pages/masternodes-list";
import RedesignMasternodesListPage from "@/themes/neo/pages/masternodes-list";

const REDESIGN_PAGE_SIZE = 25;

export const Route = createFileRoute("/masternodes/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: MasternodesListRoute,
  head: () => ({
    meta: [{ title: "Masternodes | Dashscan" }],
  }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page, limit, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({
          network,
          page: 1,
          limit: 100,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchInfiniteQuery(
        masternodesInfiniteQueryOptions({
          network,
          limit: REDESIGN_PAGE_SIZE,
          order: "desc",
        }),
      ),
    ]);
  },
});

function MasternodesListRoute() {
  const theme = useActiveTheme();
  const { page, limit } = Route.useSearch();
  if (theme === "neo") return <RedesignMasternodesListPage />;
  return <ClassicMasternodesListPage page={page} limit={limit} />;
}
