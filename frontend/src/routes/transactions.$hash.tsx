import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { transactionQueryOptions } from "@/lib/api/transactions";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";

const ClassicTransactionDetailPage = lazy(
  () => import("@/themes/dash/pages/transaction-detail"),
);

export const Route = createFileRoute("/transactions/$hash")({
  component: TransactionDetailRoute,
  head: ({ params }) => ({
    meta: [
      { title: `TX ${params.hash.slice(0, 12)}... | Dashscan` },
      {
        property: "og:title",
        content: `Transaction ${params.hash.slice(0, 12)}…`,
      },
      { property: "og:image", content: `/og/transaction/${params.hash}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `/og/transaction/${params.hash}` },
    ],
  }),
  loader: ({ context, params: { hash } }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchQuery(
          transactionQueryOptions({ network: defaultNetwork, hash }),
        ),
    ]),
});

function TransactionDetailRoute() {
  const { hash } = Route.useParams();
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicTransactionDetailPage hash={hash} />
    </Suspense>
  );
}
