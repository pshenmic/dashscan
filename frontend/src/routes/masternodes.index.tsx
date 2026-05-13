import { createFileRoute } from "@tanstack/react-router";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import { defaultNetwork } from "@/lib/store";
import { paginationSearchSchema } from "@/themes/classic/lib/pagination";
import ClassicMasternodesListPage from "@/themes/classic/pages/masternodes-list";

export const Route = createFileRoute("/masternodes/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: MasternodesListRoute,
  head: () => ({
    meta: [{ title: "Masternodes | DashScan" }],
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
    ]);
  },
});

function MasternodesListRoute() {
  const { page, limit } = Route.useSearch();
  return <ClassicMasternodesListPage page={page} limit={limit} />;
}
