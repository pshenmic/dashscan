import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Activity, ArrowLeftRight, Box, Database } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import { InstantLockBadge, TxTypeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import { mempoolQueryOptions } from "@/lib/api/mempool";
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

const chartConfig: ChartConfig = {
  value: { label: "Transactions", color: "var(--chart-1)" },
};

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
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
      context.queryClient.prefetchQuery(
        mempoolQueryOptions({ network, page: 1, limit: 1 }),
      ),
    ]);
  },
});

function TransactionsPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [search, setSearch] = useState("");
  const barGradId = useId();

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
  const { data: chainStats } = useQuery(chainStatsQueryOptions({ network }));
  const { data: mempoolData } = useQuery(
    mempoolQueryOptions({ network, page: 1, limit: 1 }),
  );

  const transactions = data?.resultSet ?? [];
  const total = data?.pagination?.total ?? 0;
  const rawMempoolTotal = mempoolData?.pagination?.total ?? null;
  const mempoolCount =
    rawMempoolTotal != null && rawMempoolTotal >= 0 ? rawMempoolTotal : 0;

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

  const chartData = useMemo(
    () =>
      (txStats ?? []).map((p) => ({
        timestamp: new Date(p.timestamp).getTime(),
        value: p.data.count,
      })),
    [txStats],
  );

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
        <Button asChild variant="link" className="h-auto gap-1.5 p-0 font-mono">
          <Link
            to="/blocks/$hashOrHeight"
            params={{ hashOrHeight: row.blockHash }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box className="size-3.5" />#{row.blockHeight}
          </Link>
        </Button>
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
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Transactions
          </h1>
          <p className="text-sm text-muted-foreground">
            All on-chain transactions across the Dash network.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardDescription>Transactions · 30 days</CardDescription>
              <CardTitle className="flex flex-wrap items-baseline gap-3 text-2xl tabular-nums">
                {stats.count30d != null ? formatCompact(stats.count30d) : "—"}
                {stats.change != null && (
                  <Badge
                    variant={
                      stats.change >= 0 ? "soft-success" : "soft-destructive"
                    }
                  >
                    {stats.change >= 0 ? "+" : ""}
                    {stats.change.toFixed(2)}%
                  </Badge>
                )}
              </CardTitle>
              <CardAction>
                <Activity className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[200px] w-full"
                >
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient
                        id={barGradId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--color-value)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-value)"
                          stopOpacity={0.4}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={48}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="value"
                      fill={`url(#${barGradId})`}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyState title="No data" className="h-[200px]" />
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card>
              <CardHeader>
                <CardDescription>Live TPS</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {chainStats?.transactionsPerSecond != null
                    ? chainStats.transactionsPerSecond.toFixed(2)
                    : stats.tps != null
                      ? stats.tps.toFixed(2)
                      : "—"}
                </CardTitle>
                <CardAction>
                  <ArrowLeftRight className="size-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {chainStats?.transactionsPerMinute != null
                  ? `${chainStats.transactionsPerMinute.toFixed(1)} /min`
                  : "Per second"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Mempool</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {formatCompact(mempoolCount)}
                </CardTitle>
                <CardAction>
                  <Database className="size-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Pending transactions
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Indexed</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {total > 0 ? formatCompact(total) : "—"}
                </CardTitle>
                <CardAction>
                  <ArrowLeftRight className="size-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                All-time transactions
              </CardContent>
            </Card>
          </div>
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
