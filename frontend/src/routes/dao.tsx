import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dao")({
  component: DaoPage,
  head: () => ({
    meta: [{ title: "DAO | DashScan" }],
  }),
});

function DaoPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-4xl font-bold tracking-tight">DAO</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Dash Decentralized Autonomous Organization governance info.
      </p>
    </main>
  );
}
