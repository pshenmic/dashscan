import { createFileRoute } from "@tanstack/react-router";
import { transactionQueryOptions } from "@/lib/api/transactions";
import { defaultNetwork } from "@/lib/store";
import ClassicTransactionDetailPage from "@/themes/classic/pages/transaction-detail";

export const Route = createFileRoute("/transactions/$hash")({
  component: TransactionDetailRoute,
  head: ({ params }) => ({
    meta: [{ title: `TX ${params.hash.slice(0, 12)}... | DashScan` }],
  }),
  loader: async ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    await context.queryClient.prefetchQuery(
      transactionQueryOptions({ network: defaultNetwork, hash }),
    );
  },
});

function TransactionDetailRoute() {
  const { hash } = Route.useParams();
  return <ClassicTransactionDetailPage hash={hash} />;
}
