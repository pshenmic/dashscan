import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { searchQueryOptions } from "@/lib/api/search";
import {
  TRANSACTION_TYPE_VALUES,
  transactionsInfiniteQueryOptions,
  transactionsQueryOptions,
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
  block_height: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .optional()
    .catch(undefined),
  hash: z
    .string()
    .regex(/^[a-f\d]{64}$/i)
    .transform((value) => value.toLowerCase())
    .optional()
    .catch(undefined),
  order: z.enum(["asc", "desc"]).catch("desc").default("desc"),
  view: z.enum(["pagination", "infinite"]).optional().catch(undefined),
});

export const Route = createFileRoute("/transactions/")({
  validateSearch: transactionsSearchSchema,
  loaderDeps: ({
    search: {
      transaction_type,
      coinjoin,
      multisig,
      block_height,
      page,
      limit,
      hash,
      order,
      view,
    },
  }) => ({
    transaction_type,
    coinjoin,
    multisig,
    block_height,
    page,
    limit,
    hash,
    order,
    view,
  }),
  component: TransactionsListRoute,
  head: () => ({
    meta: [{ title: "Transactions | Dashscan" }],
  }),
  loader: ({
    context,
    deps: {
      transaction_type,
      coinjoin,
      multisig,
      block_height,
      page,
      limit,
      hash,
      order,
      view,
    },
  }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        hash
          ? context.queryClient.prefetchQuery(
              searchQueryOptions({ network: defaultNetwork, query: hash }),
            )
          : view !== "infinite"
            ? context.queryClient.prefetchQuery(
                transactionsQueryOptions({
                  network: defaultNetwork,
                  page,
                  limit,
                  order,
                  transactionType: transaction_type,
                  coinjoin,
                  multisig,
                  blockHeight: block_height,
                }),
              )
            : context.queryClient.prefetchInfiniteQuery(
                transactionsInfiniteQueryOptions({
                  network: defaultNetwork,
                  limit,
                  order,
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
  const search = Route.useSearch();
  if (theme === "neo") return <RedesignTransactionsListPage />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicTransactionsListPage {...search} />
    </Suspense>
  );
}
