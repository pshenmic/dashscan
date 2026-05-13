import { createFileRoute } from "@tanstack/react-router";
import { blocksQueryOptions } from "@/lib/api/blocks";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { defaultNetwork } from "@/lib/store";
import { paginationSearchSchema } from "@/themes/classic/lib/pagination";
import ClassicBlocksListPage from "@/themes/classic/pages/blocks-list";

export const Route = createFileRoute("/blocks/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: BlocksListRoute,
  head: () => ({
    meta: [{ title: "Blocks | DashScan" }],
  }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page, limit, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 40, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({
          network,
          page: 1,
          limit: 1,
          order: "desc",
        }),
      ),
    ]);
  },
});

function BlocksListRoute() {
  const { page, limit } = Route.useSearch();
  return <ClassicBlocksListPage page={page} limit={limit} />;
}
