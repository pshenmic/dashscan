import { createFileRoute } from "@tanstack/react-router";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import { mempoolQueryOptions } from "@/lib/api/mempool";
import {
  monthStatsRange,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import {
  transactionsInfiniteQueryOptions,
  transactionsQueryOptions,
} from "@/lib/api/transactions";
import { paginationSearchSchema } from "@/lib/pagination";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicTransactionsListPage from "@/themes/classic/pages/transactions-list";
import RedesignTransactionsListPage from "@/themes/redesign/pages/transactions-list";

const REDESIGN_PAGE_SIZE = 25;

export const Route = createFileRoute("/transactions/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: TransactionsListRoute,
  head: () => ({
    meta: [{ title: "Transactions | DashScan" }],
  }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({ network, page, limit, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsStatsQueryOptions({
          network,
          ...monthStatsRange(),
          intervalsCount: 30,
        }),
      ),
      context.queryClient.prefetchInfiniteQuery(
        transactionsInfiniteQueryOptions({
          network,
          limit: REDESIGN_PAGE_SIZE,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
      context.queryClient.prefetchQuery(
        mempoolQueryOptions({ network, page: 1, limit: 1 }),
      ),
    ]);
  },
});

function TransactionsListRoute() {
  const theme = useActiveTheme();
  const { page, limit } = Route.useSearch();
  if (theme === "redesign") return <RedesignTransactionsListPage />;
  return <ClassicTransactionsListPage page={page} limit={limit} />;
}
