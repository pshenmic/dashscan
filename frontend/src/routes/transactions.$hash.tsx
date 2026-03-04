import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/transactions/$hash")({
  component: TransactionDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `TX ${params.hash.slice(0, 12)}... | DashScan` }],
  }),
});

function TransactionDetailPage() {
  const { hash } = Route.useParams();
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-4xl font-bold tracking-tight">Transaction {hash}</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Details for this transaction.
      </p>
    </main>
  );
}
