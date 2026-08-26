import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { TRANSACTION_TYPE_VALUES } from "@/lib/api/transactions";
import { paginationSearchSchema } from "@/lib/pagination";
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
  component: TransactionsListRoute,
  head: () => ({
    meta: [{ title: "Transactions | Dashscan" }],
  }),
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
