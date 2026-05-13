import { createFileRoute } from "@tanstack/react-router";
import {
  blocksInfiniteQueryOptions,
  blocksQueryOptions,
} from "@/lib/api/blocks";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import { blockTransactionsStatsQueryOptions } from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { paginationSearchSchema } from "@/lib/pagination";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicBlocksListPage from "@/themes/classic/pages/blocks-list";
import RedesignBlocksListPage from "@/themes/redesign/pages/blocks-list";

const INFINITE_PAGE_SIZE = 25;

function dayRange() {
  const end = new Date();
  end.setUTCMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    timestampStart: start.toISOString(),
    timestampEnd: end.toISOString(),
  };
}

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
      context.queryClient.prefetchInfiniteQuery(
        blocksInfiniteQueryOptions({
          network,
          limit: INFINITE_PAGE_SIZE,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchQuery(
        blockTransactionsStatsQueryOptions({
          network,
          ...dayRange(),
          intervalsCount: 24,
        }),
      ),
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
    ]);
  },
});

function BlocksListRoute() {
  const theme = useActiveTheme();
  const { page, limit } = Route.useSearch();
  if (theme === "redesign") return <RedesignBlocksListPage />;
  return <ClassicBlocksListPage page={page} limit={limit} />;
}
