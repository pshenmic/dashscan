import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import { mempoolQueryOptions } from "@/lib/api/mempool";
import {
  monthStatsRange,
  transactionsBreakdown24hQueryOptions,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import {
  TRANSACTION_TYPE_VALUES,
  transactionsInfiniteQueryOptions,
  transactionsQueryOptions,
} from "@/lib/api/transactions";
import { paginationSearchSchema } from "@/lib/pagination";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicTransactionsListPage from "@/themes/dash/pages/transactions-list";
import RedesignTransactionsListPage from "@/themes/neo/pages/transactions-list";

const REDESIGN_PAGE_SIZE = 25;

const transactionsSearchSchema = paginationSearchSchema.extend({
  transaction_type: z.enum(TRANSACTION_TYPE_VALUES).optional().catch(undefined),
  coinjoin: z.boolean().optional().catch(undefined),
  multisig: z.boolean().optional().catch(undefined),
  block_height: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/transactions/")({
  validateSearch: transactionsSearchSchema,
  loaderDeps: ({
    search: { page, limit, transaction_type, coinjoin, multisig, block_height },
  }) => ({
    page,
    limit,
    transaction_type,
    coinjoin,
    multisig,
    block_height,
  }),
  component: TransactionsListRoute,
  head: () => ({
    meta: [{ title: "Transactions | Dashscan" }],
  }),
  loader: ({
    context,
    deps: { page, limit, transaction_type, coinjoin, multisig, block_height },
  }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({
          network,
          page,
          limit,
          order: "desc",
          transactionType: transaction_type,
          coinjoin,
          multisig,
          blockHeight: block_height,
        }),
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
          transactionType: transaction_type,
          coinjoin,
          multisig,
          blockHeight: block_height,
        }),
      ),
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
      context.queryClient.prefetchQuery(
        mempoolQueryOptions({ network, page: 1, limit: 1 }),
      ),
      context.queryClient.prefetchQuery(
        transactionsBreakdown24hQueryOptions({ network }),
      ),
    ]);
  },
});

function TransactionsListRoute() {
  const theme = useActiveTheme();
  const { page, limit } = Route.useSearch();
  if (theme === "neo") return <RedesignTransactionsListPage />;
  return <ClassicTransactionsListPage page={page} limit={limit} />;
}
