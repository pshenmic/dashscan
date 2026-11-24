import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import {
  budgetQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";

const BudgetPage = lazy(() => import("@/themes/dash/pages/dao"));

export const Route = createFileRoute("/dao/")({
  component: DaoRoute,
  head: () => ({
    meta: [{ title: "Budget Proposals | Dashscan" }],
  }),
  loader: ({ context }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchQuery(
          budgetQueryOptions({
            network: defaultNetwork,
          }),
        ),
      () =>
        context.queryClient.prefetchQuery(
          proposalsQueryOptions({
            network: defaultNetwork,
            proposalType: "all",
          }),
        ),
    ]),
});

function DaoRoute() {
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <BudgetPage />
    </Suspense>
  );
}
