import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  DollarSign,
  Server,
} from "lucide-react";
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
import { HashDisplay } from "@/components/hash-display";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { InstantLockBadge, TxTypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { blocksQueryOptions } from "@/lib/api/blocks";
import {
  marketCapHistoricalQueryOptions,
  marketCapQueryOptions,
} from "@/lib/api/marketcap";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import {
  monthStatsRange,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { volumeHistoricalQueryOptions } from "@/lib/api/volume";
import {
  formatCompact,
  formatCompactUsd,
  formatDuffs,
  formatRelativeTime,
  sumVOut,
} from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";

type ChartMetric = "price" | "volume" | "mcap" | "txs";
type Currency = "usd" | "btc";

const chartConfig: ChartConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
};

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard | DashScan" }] }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({
          network,
          page: 1,
          limit: 10,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page: 1, limit: 1 }),
      ),
      context.queryClient.prefetchQuery(
        priceQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        priceHistoricalQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        marketCapQueryOptions({ network, currency: "usd" }),
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

function Dashboard() {
  const network = useStore(appStore, (state) => state.network);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("price");
  const [currency, setCurrency] = useState<Currency>("usd");
  const sparkGradientId = useId();
  const heroGradientId = useId();

  const { data: blocksData } = useQuery(
    blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
  );
  const { data: txData } = useQuery(
    transactionsQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
  );
  const { data: mnData } = useQuery(
    masternodesQueryOptions({ network, page: 1, limit: 1 }),
  );
  const { data: usdPrice } = useQuery(
    priceQueryOptions({ network, currency: "usd" }),
  );
  const { data: priceHistoryUsd } = useQuery(
    priceHistoricalQueryOptions({ network, currency: "usd" }),
  );
  const { data: priceHistoryBtc } = useQuery(
    priceHistoricalQueryOptions({ network, currency: "btc" }),
  );
  const { data: volumeHistoryUsd } = useQuery(
    volumeHistoricalQueryOptions({ network, currency: "usd" }),
  );
  const { data: volumeHistoryBtc } = useQuery(
    volumeHistoricalQueryOptions({ network, currency: "btc" }),
  );
  const { data: mcapHistoryUsd } = useQuery(
    marketCapHistoricalQueryOptions({ network, currency: "usd" }),
  );
  const { data: mcapHistoryBtc } = useQuery(
    marketCapHistoricalQueryOptions({ network, currency: "btc" }),
  );
  const { data: marketCap } = useQuery(
    marketCapQueryOptions({ network, currency: "usd" }),
  );
  const { data: txStats } = useQuery(
    transactionsStatsQueryOptions({
      network,
      ...monthStatsRange(),
      intervalsCount: 30,
    }),
  );

  const blocks = blocksData?.resultSet ?? [];
  const txs = txData?.resultSet ?? [];

  const latestBlock = blocks[0];
  const masternodeCount = mnData?.pagination?.total ?? null;

  const txCount30d = useMemo(
    () => txStats?.reduce((s, e) => s + e.data.count, 0) ?? 0,
    [txStats],
  );
  const txChange = useMemo(() => {
    if (!txStats || txStats.length < 4) return null;
    const sorted = [...txStats].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const half = Math.floor(sorted.length / 2);
    const first = sorted.slice(0, half).reduce((s, e) => s + e.data.count, 0);
    const second = sorted.slice(half).reduce((s, e) => s + e.data.count, 0);
    return first > 0 ? ((second - first) / first) * 100 : null;
  }, [txStats]);

  const priceSparkline = useMemo(
    () =>
      (priceHistoryUsd ?? []).slice(-24).map((p, i) => ({
        i,
        value: p.value,
      })),
    [priceHistoryUsd],
  );
  const priceChange =
    priceHistoryUsd && priceHistoryUsd.length >= 2
      ? ((priceHistoryUsd[priceHistoryUsd.length - 1].value -
          priceHistoryUsd[0].value) /
          priceHistoryUsd[0].value) *
        100
      : null;

  const heroData = useMemo(() => {
    if (chartMetric === "txs") {
      return (
        txStats?.map((e) => ({
          timestamp: new Date(e.timestamp).getTime(),
          value: e.data.count,
        })) ?? []
      );
    }
    const series =
      chartMetric === "volume"
        ? currency === "usd"
          ? volumeHistoryUsd
          : volumeHistoryBtc
        : chartMetric === "mcap"
          ? currency === "usd"
            ? mcapHistoryUsd
            : mcapHistoryBtc
          : currency === "usd"
            ? priceHistoryUsd
            : priceHistoryBtc;
    return (series ?? []).map((p) => ({
      timestamp: p.timestamp * 1000,
      value: p.value,
    }));
  }, [
    chartMetric,
    currency,
    priceHistoryUsd,
    priceHistoryBtc,
    volumeHistoryUsd,
    volumeHistoryBtc,
    mcapHistoryUsd,
    mcapHistoryBtc,
    txStats,
  ]);

  const heroValue = heroData[heroData.length - 1]?.value ?? null;
  const heroChange =
    heroData.length >= 2
      ? ((heroData[heroData.length - 1].value - heroData[0].value) /
          heroData[0].value) *
        100
      : null;

  const formatHero = (v: number) => {
    if (chartMetric === "txs") return formatCompact(v);
    if (chartMetric === "price") {
      return currency === "usd" ? `$${v.toFixed(2)}` : `${v.toFixed(6)} BTC`;
    }
    return currency === "usd" ? formatCompactUsd(v) : `${v.toFixed(2)} BTC`;
  };

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Dash Network Explorer"
          subtitle="Real-time blocks, transactions, and governance on the Dash chain."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Dash Price"
            value={
              usdPrice?.usd != null ? (
                <span>${usdPrice.usd.toFixed(2)}</span>
              ) : (
                "—"
              )
            }
            icon={<DollarSign />}
            delta={priceChange != null ? { value: priceChange } : null}
            hint={
              priceSparkline.length > 1 ? (
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-7 w-20"
                >
                  <AreaChart data={priceSparkline}>
                    <defs>
                      <linearGradient
                        id={sparkGradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--color-value)"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-value)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="value"
                      type="monotone"
                      stroke="var(--color-value)"
                      fill={`url(#${sparkGradientId})`}
                      strokeWidth={1.5}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : undefined
            }
          />
          <KpiCard
            label="Latest Block"
            value={
              latestBlock != null
                ? `#${latestBlock.height.toLocaleString()}`
                : "—"
            }
            icon={<Boxes />}
            hint={
              latestBlock?.timestamp
                ? `Mined ${formatRelativeTime(latestBlock.timestamp)}`
                : undefined
            }
          />
          <KpiCard
            label="Masternodes"
            value={
              masternodeCount != null ? formatCompact(masternodeCount) : "—"
            }
            icon={<Server />}
          />
          <KpiCard
            label="Tx Volume (30d)"
            value={txCount30d > 0 ? formatCompact(txCount30d) : "—"}
            icon={<ArrowLeftRight />}
            delta={txChange != null ? { value: txChange } : null}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Latest Blocks
              </h2>
              <Button asChild variant="ghost" size="sm" className="h-8">
                <Link to="/blocks" search={{ page: 1, limit: 10 }}>
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <ul className="flex flex-col">
              {blocks.length === 0 &&
                Array.from({ length: 6 }, (_, i) => `b-${i}`).map((k) => (
                  <li
                    key={k}
                    className="flex items-center justify-between border-b border-border/60 py-3 last:border-0"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </li>
                ))}
              {blocks.slice(0, 8).map((block) => (
                <li
                  key={block.hash}
                  className="flex items-center justify-between border-b border-border/60 py-3 last:border-0"
                >
                  <Link
                    to="/blocks/$hashOrHeight"
                    params={{ hashOrHeight: block.hash }}
                    className="flex min-w-0 items-center gap-3 no-underline"
                  >
                    <Boxes className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-mono text-sm font-medium text-accent">
                        #{block.height.toLocaleString()}
                      </span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {block.hash.slice(0, 18)}…{block.hash.slice(-6)}
                      </span>
                    </div>
                  </Link>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-medium tabular-nums">
                      {block.txCount} txs
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(block.timestamp)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Latest Transactions
              </h2>
              <Button asChild variant="ghost" size="sm" className="h-8">
                <Link to="/transactions" search={{ page: 1, limit: 10 }}>
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <ul className="flex flex-col">
              {txs.length === 0 &&
                Array.from({ length: 6 }, (_, i) => `t-${i}`).map((k) => (
                  <li
                    key={k}
                    className="flex items-center justify-between border-b border-border/60 py-3 last:border-0"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </li>
                ))}
              {txs.slice(0, 8).map((tx) => (
                <li
                  key={tx.hash}
                  className="flex items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <HashDisplay
                        value={tx.hash}
                        href="/transactions/$hash"
                        params={{ hash: tx.hash }}
                        copy={false}
                      />
                      <div className="flex items-center gap-1.5">
                        <TxTypeBadge type={tx.type} />
                        <InstantLockBadge locked={tx.instantLock} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-sm tabular-nums">
                      {formatDuffs(sumVOut(tx.vOut))}{" "}
                      <span className="text-muted-foreground text-xs">
                        DASH
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tx.timestamp ? formatRelativeTime(tx.timestamp) : "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-6 gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {chartMetric === "price"
                  ? "Dash Price"
                  : chartMetric === "volume"
                    ? "Trading Volume"
                    : chartMetric === "mcap"
                      ? "Market Cap"
                      : "Transactions per Day"}
              </h2>
              <p className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums">
                  {heroValue != null ? formatHero(heroValue) : "—"}
                </span>
                {heroChange != null && (
                  <span
                    className={
                      heroChange >= 0
                        ? "text-sm font-medium text-success"
                        : "text-sm font-medium text-destructive"
                    }
                  >
                    {heroChange >= 0 ? "+" : ""}
                    {heroChange.toFixed(2)}%
                  </span>
                )}
                {chartMetric === "mcap" && marketCap?.usd != null && (
                  <span className="text-sm text-muted-foreground">
                    Market Cap: {formatCompactUsd(marketCap.usd)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Tabs
                value={chartMetric}
                onValueChange={(v) => setChartMetric(v as ChartMetric)}
              >
                <TabsList>
                  <TabsTrigger value="price">Price</TabsTrigger>
                  <TabsTrigger value="volume">Volume</TabsTrigger>
                  <TabsTrigger value="mcap">M.Cap</TabsTrigger>
                  <TabsTrigger value="txs">TX Count</TabsTrigger>
                </TabsList>
              </Tabs>
              {chartMetric !== "txs" && (
                <Tabs
                  value={currency}
                  onValueChange={(v) => setCurrency(v as Currency)}
                >
                  <TabsList>
                    <TabsTrigger value="usd">USD</TabsTrigger>
                    <TabsTrigger value="btc">BTC</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          </div>

          {heroData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="mt-2 aspect-auto h-[320px] w-full"
            >
              {chartMetric === "volume" ? (
                <BarChart data={heroData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
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
                    width={64}
                    tickFormatter={(v) =>
                      currency === "usd"
                        ? formatCompactUsd(Number(v))
                        : Number(v).toFixed(2)
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="value"
                    fill="var(--color-value)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              ) : (
                <AreaChart data={heroData}>
                  <defs>
                    <linearGradient
                      id={heroGradientId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
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
                    width={64}
                    tickFormatter={(v) => {
                      if (chartMetric === "txs")
                        return formatCompact(Number(v));
                      if (chartMetric === "price") {
                        return currency === "usd"
                          ? `$${Number(v).toFixed(0)}`
                          : Number(v).toFixed(5);
                      }
                      return currency === "usd"
                        ? formatCompactUsd(Number(v))
                        : Number(v).toFixed(2);
                    }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="value"
                    type="monotone"
                    stroke="var(--color-value)"
                    fill={`url(#${heroGradientId})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              )}
            </ChartContainer>
          ) : (
            <div className="mt-2 flex h-[320px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No data available
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
