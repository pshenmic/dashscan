import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/masternodes/")({
  component: MasternodesPage,
  head: () => ({
    meta: [{ title: "Masternodes | DashScan" }],
  }),
});

function MasternodesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-4xl font-bold tracking-tight">Masternodes</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        List of Dash masternodes.
      </p>
    </main>
  );
}
