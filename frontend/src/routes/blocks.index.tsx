import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Activity, Boxes, Clock, Gauge, Layers } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
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
import { blocksQueryOptions } from "@/lib/api/blocks";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import { blockTransactionsStatsQueryOptions } from "@/lib/api/stats";
import type { ApiBlock } from "@/lib/api/types";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";

const chartConfig: ChartConfig = {
  value: { label: "Avg tx", color: "var(--chart-1)" },
};

const sizeChartConfig: ChartConfig = {
  value: { label: "Size", color: "var(--chart-2)" },
};

function dayRange() {
  const end = new Date();
  end.setUTCMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    timestampStart: start.toISOString(),
    timestampEnd: end.toISOString(),
  };
}

export const Route = createFileRoute("/blocks/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: BlocksPage,
  head: () => ({ meta: [{ title: "Blocks | DashScan" }] }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page, limit, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        blockTransactionsStatsQueryOptions({
          network,
          ...dayRange(),
          intervalsCount: 24,
        }),
      ),
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
    ]);
  },
});

function BlocksPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [search, setSearch] = useState("");
  const txGradId = useId();
  const sizeGradId = useId();

  const { data, isFetching } = useQuery(
    blocksQueryOptions({ network, page, limit, order: "desc" }),
  );
  const { data: blockTxStats } = useQuery(
    blockTransactionsStatsQueryOptions({
      network,
      ...dayRange(),
      intervalsCount: 24,
    }),
  );
  const { data: chainStats } = useQuery(chainStatsQueryOptions({ network }));

  const blocks = data?.resultSet ?? [];
  const total = data?.pagination?.total ?? 0;

  const filtered = useMemo(() => {
    if (!search) return blocks;
    const q = search.toLowerCase();
    return blocks.filter(
      (b) => b.hash.toLowerCase().includes(q) || String(b.height).includes(q),
    );
  }, [search, blocks]);

  const stats = useMemo(() => {
    const latestHeight = blocks.length > 0 ? blocks[0].height : null;
    let avgBlockTime: number | null = null;
    if (blocks.length >= 2) {
      const times = blocks.map((b) => new Date(b.timestamp).getTime());
      const diffs: number[] = [];
      for (let i = 0; i < times.length - 1; i++) {
        diffs.push(Math.abs(times[i] - times[i + 1]));
      }
      avgBlockTime = diffs.reduce((s, d) => s + d, 0) / diffs.length / 1000;
    }
    return { latestHeight, avgBlockTime };
  }, [blocks]);

  const txAvgChartData = useMemo(
    () =>
      (blockTxStats ?? []).map((p) => ({
        timestamp: new Date(p.timestamp).getTime(),
        value: p.data.avg ?? 0,
      })),
    [blockTxStats],
  );

  const sizeChartData = useMemo(
    () =>
      [...blocks]
        .sort((a, b) => a.height - b.height)
        .map((b) => ({
          height: b.height,
          value: b.size / 1024,
        })),
    [blocks],
  );

  const columns: DataTableColumn<ApiBlock>[] = [
    {
      id: "height",
      header: "Height",
      cell: (row) => (
        <span className="font-mono text-sm font-medium tabular-nums">
          #{row.height.toLocaleString()}
        </span>
      ),
      width: 140,
    },
    {
      id: "hash",
      header: "Block Hash",
      cell: (row) => (
        <HashDisplay
          value={row.hash}
          href="/blocks/$hashOrHeight"
          params={{ hashOrHeight: row.hash }}
        />
      ),
    },
    {
      id: "txs",
      header: "Txs",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums">{row.txCount}</span>
      ),
    },
    {
      id: "size",
      header: "Size",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {(row.size / 1024).toFixed(2)} KB
        </span>
      ),
    },
    {
      id: "difficulty",
      header: "Difficulty",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {row.difficulty.toFixed(4)}
        </span>
      ),
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
            Blocks
          </h1>
          <p className="text-sm text-muted-foreground">
            Latest blocks on the Dash network.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Latest Block</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {stats.latestHeight != null
                  ? `#${stats.latestHeight.toLocaleString()}`
                  : "—"}
              </CardTitle>
              <CardAction>
                <Layers className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Avg Block Time</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {stats.avgBlockTime != null
                  ? `${stats.avgBlockTime.toFixed(0)}s`
                  : chainStats?.blockTime != null
                    ? `${(chainStats.blockTime / 1000).toFixed(0)}s`
                    : "—"}
              </CardTitle>
              <CardAction>
                <Clock className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Across the latest {blocks.length} blocks
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Difficulty</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {chainStats?.difficulty != null
                  ? chainStats.difficulty.toFixed(4)
                  : "—"}
              </CardTitle>
              <CardAction>
                <Gauge className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Current PoW difficulty
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Blocks</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {total > 0 ? formatCompact(total) : "—"}
              </CardTitle>
              <CardAction>
                <Boxes className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Indexed all-time
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>
                Avg Transactions per Block · 24h
              </CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-xl tabular-nums">
                {txAvgChartData.length > 0
                  ? (
                      txAvgChartData.reduce((s, p) => s + p.value, 0) /
                      txAvgChartData.length
                    ).toFixed(2)
                  : "—"}
                <span className="text-xs font-normal text-muted-foreground">
                  tx / block
                </span>
              </CardTitle>
              <CardAction>
                <Activity className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {txAvgChartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[180px] w-full"
                >
                  <AreaChart data={txAvgChartData}>
                    <defs>
                      <linearGradient id={txGradId} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-value)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-value)"
                          stopOpacity={0}
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
                        new Date(v).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          hour12: false,
                        })
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={40}
                      tickFormatter={(v) => Number(v).toFixed(0)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="value"
                      type="monotone"
                      stroke="var(--color-value)"
                      fill={`url(#${txGradId})`}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <EmptyState title="No data" className="h-[180px]" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Block Size · Recent Blocks</CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-xl tabular-nums">
                {sizeChartData.length > 0
                  ? (
                      sizeChartData.reduce((s, p) => s + p.value, 0) /
                      sizeChartData.length
                    ).toFixed(2)
                  : "—"}
                <span className="text-xs font-normal text-muted-foreground">
                  KB avg
                </span>
              </CardTitle>
              <CardAction>
                <Boxes className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {sizeChartData.length > 0 ? (
                <ChartContainer
                  config={sizeChartConfig}
                  className="aspect-auto h-[180px] w-full"
                >
                  <BarChart data={sizeChartData}>
                    <defs>
                      <linearGradient
                        id={sizeGradId}
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
                      dataKey="height"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                      tickFormatter={(v) => `#${v}`}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={40}
                      tickFormatter={(v) => `${Number(v).toFixed(0)}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="value"
                      fill={`url(#${sizeGradId})`}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyState title="No data" className="h-[180px]" />
              )}
            </CardContent>
          </Card>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isFetching}
          rowKey={(row) => row.hash}
          onRowClick={(block) =>
            navigate({
              to: "/blocks/$hashOrHeight",
              params: { hashOrHeight: block.hash },
            })
          }
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Filter visible page by hash or height…",
          }}
          emptyTitle="No blocks"
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
