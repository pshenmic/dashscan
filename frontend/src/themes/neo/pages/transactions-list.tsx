import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  Activity,
  ArrowLeftRight,
  ArrowRightFromLine,
  ArrowRightToLine,
  Box,
  Database,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DashIcon } from "@/components/dash-icon";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import { mempoolQueryOptions } from "@/lib/api/mempool";
import {
  monthStatsRange,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import {
  transactionsInfiniteQueryOptions,
  transactionsQueryOptions,
} from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import {
  formatCompact,
  formatDuffs,
  formatRelativeTime,
  sumVOut,
} from "@/lib/format";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import { EmptyState } from "@/themes/neo/components/empty-state";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import {
  InstantLockBadge,
  TxTypeBadge,
} from "@/themes/neo/components/status-badge";
import { Badge } from "@/themes/neo/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";

const INFINITE_PAGE_SIZE = 25;
const PAGINATION_PAGE_SIZE = 25;

const chartConfig: ChartConfig = {
  value: { label: "Transactions", color: "var(--chart-1)" },
};

export default function RedesignTransactionsListPage() {
  const network = useStore(appStore, (state) => state.network);
  const navigate = useNavigate({ from: "/transactions/" });
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useTableViewMode("transactions");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE);
  const barGradId = useId();

  const isInfinite = viewMode === "infinite";

  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...transactionsInfiniteQueryOptions({
        network,
        limit: INFINITE_PAGE_SIZE,
        order: "desc",
      }),
      enabled: isInfinite,
    });
  const { data: pagedData, isFetching: isPagedFetching } = useQuery({
    ...transactionsQueryOptions({
      network,
      page,
      limit: pageSize,
      order: "desc",
    }),
    enabled: !isInfinite,
  });

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

  const infiniteTransactions = useMemo(
    () => data?.pages.flatMap((p) => p.resultSet) ?? [],
    [data],
  );
  const transactions = isInfinite
    ? infiniteTransactions
    : (pagedData?.resultSet ?? []);
  const total = isInfinite
    ? (data?.pages[0]?.pagination?.total ?? 0)
    : (pagedData?.pagination?.total ?? 0);
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
      header: "Transaction",
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
            <ArrowLeftRight className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <HashDisplay
              value={row.hash}
              href="/transactions/$hash"
              params={{ hash: row.hash }}
              copy={false}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <TxTypeBadge type={row.type} />
              <InstantLockBadge locked={row.instantLock} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="soft" className="font-mono">
                    <ArrowRightToLine className="size-3" />
                    {row.vIn?.length ?? 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {row.vIn?.length ?? 0} input
                  {(row.vIn?.length ?? 0) === 1 ? "" : "s"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="soft" className="font-mono">
                    <ArrowRightFromLine className="size-3" />
                    {row.vOut?.length ?? 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {row.vOut?.length ?? 0} output
                  {(row.vOut?.length ?? 0) === 1 ? "" : "s"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      ),
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
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-sm font-medium tabular-nums text-accent">
            {formatDuffs(sumVOut(row.vOut))} <DashIcon />
          </span>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {row.timestamp ? formatRelativeTime(row.timestamp) : "—"}
          </span>
        </div>
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
          <Card className="lg:col-span-8 flex flex-col">
            <CardHeader>
              <CardDescription>Transactions · 30 days</CardDescription>
              <CardTitle className="flex flex-wrap items-baseline gap-3 text-2xl tabular-nums text-accent">
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
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Activity className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto w-full flex-1 min-h-[200px]"
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
                <CardTitle className="text-xl tabular-nums text-accent">
                  {chainStats?.transactionsPerSecond != null
                    ? chainStats.transactionsPerSecond.toFixed(2)
                    : stats.tps != null
                      ? stats.tps.toFixed(2)
                      : "—"}
                </CardTitle>
                <CardAction>
                  <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                    <ArrowLeftRight className="size-4" />
                  </div>
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
                <CardTitle className="text-xl tabular-nums text-accent">
                  {formatCompact(mempoolCount)}
                </CardTitle>
                <CardAction>
                  <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                    <Database className="size-4" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Pending transactions
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Indexed</CardDescription>
                <CardTitle className="text-xl tabular-nums text-accent">
                  {total > 0 ? formatCompact(total) : "—"}
                </CardTitle>
                <CardAction>
                  <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                    <ArrowLeftRight className="size-4" />
                  </div>
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
          isLoading={
            (isInfinite ? isFetching : isPagedFetching) &&
            transactions.length === 0
          }
          rowKey={(row) => row.hash}
          onRowClick={(tx) =>
            navigate({ to: "/transactions/$hash", params: { hash: tx.hash } })
          }
          search={{
            value: search,
            onChange: setSearch,
            placeholder: isInfinite
              ? "Filter loaded transactions by hash or block…"
              : "Filter visible page by hash or block…",
          }}
          emptyTitle="No transactions"
          viewMode={{ value: viewMode, onChange: setViewMode }}
          infiniteScroll={{
            hasNextPage,
            isFetchingNextPage,
            onLoadMore: () => fetchNextPage(),
            total,
            loaded: transactions.length,
            skeletonRows: 5,
          }}
          pagination={{
            pageIndex: page,
            pageSize,
            total,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </div>
    </div>
  );
}
