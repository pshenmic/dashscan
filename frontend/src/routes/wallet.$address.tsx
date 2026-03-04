import { createFileRoute } from "@tanstack/react-router";
import { Avatar } from "dash-ui-kit/react";

export const Route = createFileRoute("/wallet/$address")({
  component: WalletPage,
  head: ({ params }) => ({
    meta: [{ title: `Wallet ${params.address.slice(0, 12)}... | DashScan` }],
  }),
});

function WalletPage() {
  const { address } = Route.useParams();
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full border border-accent/12">
          <Avatar username={address} className="size-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Wallet {address}</h1>
      </div>
      <p className="mt-4 text-lg text-muted-foreground">
        Address details and balance.
      </p>
    </main>
  );
}
