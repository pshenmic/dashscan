import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import {
  TRANSACTION_TYPE_VALUES,
  transactionsInfiniteQueryOptions,
} from "@/lib/api/transactions";
import { paginationSearchSchema } from "@/lib/pagination";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignTransactionsListPage from "@/themes/neo/pages/transactions-list";

const ClassicTransactionsListPage = lazy(
  () => import("@/themes/dash/pages/transactions-list"),
);

const transactionsSearchSchema = paginationSearchSchema.extend({
  transaction_type: z.enum(TRANSACTION_TYPE_VALUES).optional().catch(undefined),
  coinjoin: z.boolean().optional().catch(undefined),
  multisig: z.boolean().optional().catch(undefined),
  block_height: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/transactions/")({
  validateSearch: transactionsSearchSchema,
  loaderDeps: ({
    search: { transaction_type, coinjoin, multisig, block_height },
  }) => ({ transaction_type, coinjoin, multisig, block_height }),
  component: TransactionsListRoute,
  head: () => ({
    meta: [{ title: "Transactions | Dashscan" }],
  }),
  loader: ({
    context,
    deps: { transaction_type, coinjoin, multisig, block_height },
  }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchInfiniteQuery(
          transactionsInfiniteQueryOptions({
            network: defaultNetwork,
            limit: 25,
            order: "desc",
            transactionType: transaction_type,
            coinjoin,
            multisig,
            blockHeight: block_height,
          }),
        ),
    ]),
});

function TransactionsListRoute() {
  const theme = useActiveTheme();
  const { page, limit } = Route.useSearch();
  if (theme === "neo") return <RedesignTransactionsListPage />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicTransactionsListPage page={page} limit={limit} />
    </Suspense>
  );
}
