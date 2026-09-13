import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { proposalsQueryOptions } from "@/lib/api/governance";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignDaoPage from "@/themes/neo/pages/dao";

const ClassicDaoPage = lazy(() => import("@/themes/dash/pages/dao"));

export const Route = createFileRoute("/dao/")({
  component: DaoRoute,
  head: () => ({
    meta: [{ title: "DAO | Dashscan" }],
  }),
  loader: ({ context }) =>
    prefetchSsrData(context.queryClient, [
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
  const theme = useActiveTheme();
  if (theme === "neo") return <RedesignDaoPage />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicDaoPage />
    </Suspense>
  );
}
