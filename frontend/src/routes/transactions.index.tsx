import { createFileRoute } from "@tanstack/react-router";
import {
  monthStatsRange,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { paginationSearchSchema } from "@/lib/pagination";
import { defaultNetwork } from "@/lib/store";
import ClassicTransactionsListPage from "@/themes/classic/pages/transactions-list";

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
        transactionsQueryOptions({
          network,
          page,
          limit,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchQuery(
        transactionsStatsQueryOptions({
          network,
          ...monthStatsRange(),
          intervalsCount: 30,
        }),
      ),
    ]);
  },
});

function TransactionsListRoute() {
  const { page, limit } = Route.useSearch();
  return <ClassicTransactionsListPage page={page} limit={limit} />;
}
