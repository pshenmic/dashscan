import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ArrowLeftRight, Box } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { HashDisplay } from "@/components/hash-display";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { InstantLockBadge, TxTypeBadge } from "@/components/status-badge";
import {
  monthStatsRange,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import {
  formatCompact,
  formatDuffs,
  formatRelativeTime,
  sumVOut,
} from "@/lib/format";
import { paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/transactions/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: TransactionsPage,
  head: () => ({ meta: [{ title: "Transactions | DashScan" }] }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({ network, page, limit, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsStatsQueryOptions({
          network,
          ...monthStatsRange(),
          intervalsCount: 30,
        }),
      ),
    ]);
  },
});

function TransactionsPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [search, setSearch] = useState("");

  const { data, isFetching } = useQuery(
    transactionsQueryOptions({ network, page, limit, order: "desc" }),
  );

  const { data: txStats } = useQuery(
    transactionsStatsQueryOptions({
      network,
      ...monthStatsRange(),
      intervalsCount: 30,
    }),
  );

  const transactions = data?.resultSet ?? [];
  const total = data?.pagination?.total ?? 0;

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.hash.toLowerCase().includes(q) ||
        String(t.blockHeight).includes(q) ||
        t.blockHash?.toLowerCase().includes(q),
    );
  }, [search, transactions]);

  const stats = useMemo(() => {
    if (!txStats?.length) return { count30d: null, tps: null, change: null };
    const sorted = [...txStats].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const total30d = sorted.reduce((s, e) => s + e.data.count, 0);
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted
      .slice(0, half)
      .reduce((s, e) => s + e.data.count, 0);
    const secondHalf = sorted.slice(half).reduce((s, e) => s + e.data.count, 0);
    const firstTs = new Date(sorted[0].timestamp).getTime();
    const lastTs = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const spanSeconds = (lastTs - firstTs) / 1000;
    const tps = spanSeconds > 0 ? total30d / spanSeconds : null;
    const change =
      firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : null;
    return { count30d: total30d, tps, change };
  }, [txStats]);

  const columns: DataTableColumn<ApiTransaction>[] = [
    {
      id: "hash",
      header: "Hash",
      cell: (row) => (
        <HashDisplay
          value={row.hash}
          href="/transactions/$hash"
          params={{ hash: row.hash }}
        />
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => <TxTypeBadge type={row.type} />,
    },
    {
      id: "block",
      header: "Block",
      cell: (row) => (
        <Link
          to="/blocks/$hashOrHeight"
          params={{ hashOrHeight: row.blockHash }}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-accent no-underline hover:underline"
        >
          <Box className="size-3.5" />
          <span className="font-mono text-sm">#{row.blockHeight}</span>
        </Link>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <span className="font-mono tabular-nums">
          {formatDuffs(sumVOut(row.vOut))}{" "}
          <span className="text-muted-foreground">DASH</span>
        </span>
      ),
    },
    {
      id: "confirmations",
      header: "Confirms",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {row.confirmations?.toLocaleString() ?? "—"}
        </span>
      ),
    },
    {
      id: "instantlock",
      header: "InstantSend",
      cell: (row) => <InstantLockBadge locked={row.instantLock} />,
    },
    {
      id: "time",
      header: "Age",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatRelativeTime(row.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Transactions"
          subtitle="All on-chain transactions across the Dash network."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Transactions (30d)"
            value={stats.count30d != null ? formatCompact(stats.count30d) : "—"}
            icon={<ArrowLeftRight />}
            delta={stats.change != null ? { value: stats.change } : null}
            hint={<span>vs prior 15 days</span>}
          />
          <KpiCard
            label="Average TPS"
            value={stats.tps != null ? stats.tps.toFixed(2) : "—"}
            icon={<ArrowLeftRight />}
            hint="Transactions per second (30d window)"
          />
          <KpiCard
            label="Total"
            value={total > 0 ? formatCompact(total) : "—"}
            hint="All-time transactions indexed"
          />
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isFetching}
          rowKey={(row) => row.hash}
          onRowClick={(tx) =>
            navigate({ to: "/transactions/$hash", params: { hash: tx.hash } })
          }
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Filter visible page by hash or block…",
          }}
          emptyTitle="No transactions"
          pagination={{
            pageIndex: page,
            pageSize: limit,
            total,
            onPageChange: (p) => navigate({ search: { page: p, limit } }),
            onPageSizeChange: (size) =>
              navigate({
                // biome-ignore lint/suspicious/noExplicitAny: pagination size literal
                search: { page: 1, limit: size as any },
              }),
          }}
        />
      </div>
    </div>
  );
}
