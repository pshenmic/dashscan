import { createFileRoute } from "@tanstack/react-router";
import { transactionQueryOptions } from "@/lib/api/transactions";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicTransactionDetailPage from "@/themes/dash/pages/transaction-detail";
import RedesignTransactionDetailPage from "@/themes/neo/pages/transaction-detail";

export const Route = createFileRoute("/transactions/$hash")({
  component: TransactionDetailRoute,
  head: ({ params }) => ({
    meta: [
      { title: `TX ${params.hash.slice(0, 12)}... | DashScan` },
      {
        property: "og:title",
        content: `Transaction ${params.hash.slice(0, 12)}…`,
      },
      { property: "og:image", content: `/og/transaction/${params.hash}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `/og/transaction/${params.hash}` },
    ],
  }),
  loader: async ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    await context.queryClient.prefetchQuery(
      transactionQueryOptions({ network: defaultNetwork, hash }),
    );
  },
});

function TransactionDetailRoute() {
  const theme = useActiveTheme();
  const { hash } = Route.useParams();
  if (theme === "neo") return <RedesignTransactionDetailPage hash={hash} />;
  return <ClassicTransactionDetailPage hash={hash} />;
}
