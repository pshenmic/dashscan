import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  Activity,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Boxes,
  Coins,
  Database,
  DollarSign,
  Gauge,
  HardDrive,
  Hourglass,
  Layers,
  PieChart,
  Server,
  TrendingUp,
  Vote,
  Wallet,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { DashIcon } from "@/components/dash-icon";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { blocksQueryOptions } from "@/lib/api/blocks";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import {
  budgetQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import {
  marketCapHistoricalQueryOptions,
  marketCapQueryOptions,
} from "@/lib/api/marketcap";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import { mempoolQueryOptions } from "@/lib/api/mempool";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import {
  blockTransactionsStatsQueryOptions,
  monthStatsRange,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import {
  volumeHistoricalQueryOptions,
  volumeQueryOptions,
} from "@/lib/api/volume";
import {
  formatCompact,
  formatCompactUsd,
  formatCompactUsdShort,
  formatDuffs,
  formatRelativeTime,
  sumVOut,
} from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";

const chartConfig: ChartConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
};

function dayStatsRange() {
  const end = new Date();
  end.setUTCMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    timestampStart: start.toISOString(),
    timestampEnd: end.toISOString(),
  };
}

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
        marketCapHistoricalQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        volumeQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        volumeHistoricalQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsStatsQueryOptions({
          network,
          ...monthStatsRange(),
          intervalsCount: 30,
        }),
      ),
      context.queryClient.prefetchQuery(
        blockTransactionsStatsQueryOptions({
          network,
          ...dayStatsRange(),
          intervalsCount: 24,
        }),
      ),
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
      context.queryClient.prefetchQuery(budgetQueryOptions({ network })),
      context.queryClient.prefetchQuery(proposalsQueryOptions({ network })),
      context.queryClient.prefetchQuery(
        mempoolQueryOptions({ network, page: 1, limit: 1 }),
      ),
    ]);
  },
});

function Dashboard() {
  const network = useStore(appStore, (state) => state.network);
  const priceSparkId = useId();
  const mcapAreaId = useId();
  const txsAreaId = useId();
  const blockTxAreaId = useId();
  const volumeBarId = useId();

  const { data: blocksData } = useQuery(
    blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
  );
  const { data: txData } = useQuery({
    ...transactionsQueryOptions({
      network,
      page: 1,
      limit: 10,
      order: "desc",
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const { data: mnData } = useQuery(
    masternodesQueryOptions({ network, page: 1, limit: 1 }),
  );
  const { data: usdPrice } = useQuery(
    priceQueryOptions({ network, currency: "usd" }),
  );
  const { data: priceHistoryUsd } = useQuery(
    priceHistoricalQueryOptions({ network, currency: "usd" }),
  );
  const { data: volumeUsd } = useQuery(
    volumeQueryOptions({ network, currency: "usd" }),
  );
  const { data: volumeHistoryUsd } = useQuery(
    volumeHistoricalQueryOptions({ network, currency: "usd" }),
  );
  const { data: mcapHistoryUsd } = useQuery(
    marketCapHistoricalQueryOptions({ network, currency: "usd" }),
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
  const { data: blockTxStats } = useQuery(
    blockTransactionsStatsQueryOptions({
      network,
      ...dayStatsRange(),
      intervalsCount: 24,
    }),
  );
  const { data: chainStats } = useQuery(chainStatsQueryOptions({ network }));
  const { data: budget } = useQuery(budgetQueryOptions({ network }));
  const { data: proposals } = useQuery(proposalsQueryOptions({ network }));
  const { data: mempoolData } = useQuery(
    mempoolQueryOptions({ network, page: 1, limit: 1 }),
  );

  const blocks = blocksData?.resultSet ?? [];
  const rawTxs = txData?.resultSet ?? [];
  const txs = useMemo(() => {
    const toMs = (t: string | number | undefined | null) => {
      if (t == null) return 0;
      if (typeof t === "number" || /^\d+$/.test(t)) {
        return Number(t) * 1000;
      }
      const ms = new Date(t).getTime();
      return Number.isNaN(ms) ? 0 : ms;
    };
    return [...rawTxs].sort(
      (a, b) =>
        toMs(b.timestamp) - toMs(a.timestamp) || b.hash.localeCompare(a.hash),
    );
  }, [rawTxs]);
  const seenTxHashesRef = useRef<Set<string> | null>(null);
  const [newTxHashes, setNewTxHashes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (txs.length === 0) return;
    const currentHashes = new Set(txs.map((t) => t.hash));
    if (seenTxHashesRef.current === null) {
      seenTxHashesRef.current = currentHashes;
      return;
    }
    const fresh = new Set<string>();
    for (const h of currentHashes) {
      if (!seenTxHashesRef.current.has(h)) fresh.add(h);
    }
    seenTxHashesRef.current = currentHashes;
    if (fresh.size === 0) return;
    setNewTxHashes(fresh);
    const timer = setTimeout(() => setNewTxHashes(new Set()), 2400);
    return () => clearTimeout(timer);
  }, [txs]);
  const latestBlock = blocks[0];
  const masternodeCount = mnData?.pagination?.total ?? null;
  const rawMempoolTotal = mempoolData?.pagination?.total ?? null;
  const mempoolCount =
    rawMempoolTotal != null && rawMempoolTotal >= 0 ? rawMempoolTotal : 0;
  const txsTotal = txData?.pagination?.total ?? null;
  const blocksTotal = blocksData?.pagination?.total ?? null;

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
      (priceHistoryUsd ?? []).map((p, i) => ({
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

  const mcapChange =
    mcapHistoryUsd && mcapHistoryUsd.length >= 2
      ? ((mcapHistoryUsd[mcapHistoryUsd.length - 1].value -
          mcapHistoryUsd[0].value) /
          mcapHistoryUsd[0].value) *
        100
      : null;

  const volumeChange =
    volumeHistoryUsd && volumeHistoryUsd.length >= 2
      ? ((volumeHistoryUsd[volumeHistoryUsd.length - 1].value -
          volumeHistoryUsd[0].value) /
          Math.max(volumeHistoryUsd[0].value, 0.0001)) *
        100
      : null;

  const circulatingSupply =
    marketCap?.usd != null && usdPrice?.usd != null && usdPrice.usd > 0
      ? marketCap.usd / usdPrice.usd
      : null;

  const avgBlockSize = useMemo(() => {
    if (blocks.length === 0) return null;
    return blocks.reduce((s, b) => s + b.size, 0) / blocks.length;
  }, [blocks]);

  const avgTxAmount = useMemo(() => {
    if (txs.length === 0) return null;
    const totals = txs.map((t) => sumVOut(t.vOut));
    return totals.reduce((s, v) => s + v, 0) / totals.length;
  }, [txs]);

  const priceData = useMemo(
    () =>
      (priceHistoryUsd ?? []).map((p) => ({
        timestamp: p.timestamp * 1000,
        value: p.value,
      })),
    [priceHistoryUsd],
  );
  const mcapData = useMemo(
    () =>
      (mcapHistoryUsd ?? []).map((p) => ({
        timestamp: p.timestamp * 1000,
        value: p.value,
      })),
    [mcapHistoryUsd],
  );
  const volumeData = useMemo(
    () =>
      (volumeHistoryUsd ?? []).map((p) => ({
        timestamp: p.timestamp * 1000,
        value: p.value,
      })),
    [volumeHistoryUsd],
  );
  const txsData = useMemo(
    () =>
      (txStats ?? []).map((p) => ({
        timestamp: new Date(p.timestamp).getTime(),
        value: p.data.count,
      })),
    [txStats],
  );
  const blockTxData = useMemo(
    () =>
      (blockTxStats ?? []).map((p) => ({
        timestamp: new Date(p.timestamp).getTime(),
        value: p.data.avg ?? 0,
      })),
    [blockTxStats],
  );

  const proposalCount = proposals?.length ?? null;

  const budgetUsedPct =
    budget?.totalBudget && budget.totalBudget > 0
      ? Math.min(100, (budget.totalRequested / budget.totalBudget) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Welcome to #1</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="text-accent">Dash</span> Network Explorer
          </h1>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Dash Price"
            value={usdPrice?.usd != null ? `$${usdPrice.usd.toFixed(2)}` : "—"}
            change={priceChange}
            icon={<DollarSign className="size-4 text-muted-foreground" />}
            sparkline={priceSparkline}
            sparkId={priceSparkId}
          />
          <KpiCard
            label="Market Cap"
            value={
              marketCap?.usd != null ? formatCompactUsd(marketCap.usd) : "—"
            }
            change={mcapChange}
            icon={<PieChart className="size-4 text-muted-foreground" />}
          />
          <KpiCard
            label="24h Volume"
            value={
              volumeUsd?.usd != null ? formatCompactUsd(volumeUsd.usd) : "—"
            }
            change={volumeChange}
            icon={<TrendingUp className="size-4 text-muted-foreground" />}
          />
          <KpiCard
            label="Circulating Supply"
            value={
              circulatingSupply != null ? (
                <>
                  {formatCompact(circulatingSupply)} <DashIcon />
                </>
              ) : (
                "—"
              )
            }
            icon={<Coins className="size-4 text-muted-foreground" />}
            sublabel="vs 18.9M cap"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Latest Transactions
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
              </CardTitle>
              <CardDescription>
                The most recent on-chain transactions.
              </CardDescription>
              <CardAction>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link to="/transactions" search={{ page: 1, limit: 10 }}>
                    View all <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {txs.length === 0 &&
                    Array.from({ length: 6 }, (_, i) => `t-${i}`).map((k) => (
                      <TableRow key={k} className="hover:bg-transparent">
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-4 w-16" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {txs.slice(0, 8).map((tx) => {
                    const isNew = newTxHashes.has(tx.hash);
                    return (
                      <TableRow
                        key={tx.hash}
                        className={
                          isNew
                            ? "animate-in slide-in-from-top-2 fade-in duration-500 animate-tx-flash"
                            : undefined
                        }
                      >
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono text-sm tabular-nums">
                              {formatDuffs(sumVOut(tx.vOut))} <DashIcon />
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {tx.timestamp
                                ? formatRelativeTime(tx.timestamp)
                                : "—"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="lg:col-span-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <StatTile
              icon={<Layers className="size-4 text-muted-foreground" />}
              label="Latest Block"
              value={
                latestBlock != null
                  ? `#${latestBlock.height.toLocaleString()}`
                  : "—"
              }
              hint={
                latestBlock?.timestamp
                  ? formatRelativeTime(latestBlock.timestamp)
                  : undefined
              }
            />
            <StatTile
              icon={<Server className="size-4 text-muted-foreground" />}
              label="Masternodes"
              value={
                masternodeCount != null ? formatCompact(masternodeCount) : "—"
              }
              hint="Securing the network"
            />
            <StatTile
              icon={<Gauge className="size-4 text-muted-foreground" />}
              label="Difficulty"
              value={
                chainStats?.difficulty != null
                  ? chainStats.difficulty.toFixed(4)
                  : "—"
              }
              hint="Current PoW"
            />
            <StatTile
              icon={<HardDrive className="size-4 text-muted-foreground" />}
              label="Blockchain Size"
              value={
                chainStats?.sizeOnDisk != null
                  ? formatBytes(chainStats.sizeOnDisk)
                  : "—"
              }
              hint="On-disk data"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={<Activity className="size-4 text-muted-foreground" />}
            label="Live TPS"
            value={
              chainStats?.transactionsPerSecond != null
                ? chainStats.transactionsPerSecond.toFixed(2)
                : "—"
            }
            hint={
              chainStats?.transactionsPerMinute != null
                ? `${chainStats.transactionsPerMinute.toFixed(1)} /min`
                : "Avg over 20 blocks"
            }
            tone="accent"
          />
          <StatTile
            icon={<Hourglass className="size-4 text-muted-foreground" />}
            label="Avg Block Time"
            value={
              chainStats?.blockTime != null
                ? `${(chainStats.blockTime / 1000).toFixed(0)}s`
                : "—"
            }
            hint="Across last 20 blocks"
            tone="accent"
          />
          <StatTile
            icon={<Database className="size-4 text-muted-foreground" />}
            label="Mempool"
            value={formatCompact(mempoolCount)}
            hint="Pending tx"
            tone="accent"
          />
          <StatTile
            icon={<Boxes className="size-4 text-muted-foreground" />}
            label="Avg Block Size"
            value={avgBlockSize != null ? formatBytes(avgBlockSize) : "—"}
            hint={`Last ${blocks.length || 0} blocks`}
            tone="accent"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardDescription>Transactions · 30 days</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {txCount30d > 0 ? formatCompact(txCount30d) : "—"}
                {txChange != null && (
                  <Badge
                    variant={
                      txChange >= 0 ? "soft-success" : "soft-destructive"
                    }
                    className="ml-3"
                  >
                    {txChange >= 0 ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    )}
                    {Math.abs(txChange).toFixed(1)}%
                  </Badge>
                )}
              </CardTitle>
              <CardAction>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link to="/transactions" search={{ page: 1, limit: 10 }}>
                    View all <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ChartArea
                data={txsData}
                gradientId={txsAreaId}
                yFormat={(v) => formatCompact(Number(v))}
                height={200}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-5 bg-gradient-to-br from-card to-secondary/40">
            <CardHeader>
              <CardDescription>DAO Treasury · Next Superblock</CardDescription>
              <CardTitle className="flex items-baseline gap-3 text-2xl tabular-nums text-accent">
                {budget?.totalBudget != null ? (
                  <span>
                    {budget.totalBudget.toFixed(2)} <DashIcon />
                  </span>
                ) : (
                  "—"
                )}
                {usdPrice?.usd != null && budget?.totalBudget != null && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ≈ {formatCompactUsd(budget.totalBudget * usdPrice.usd)}
                  </span>
                )}
              </CardTitle>
              <CardAction>
                <Vote className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Requested</span>
                  <span className="font-mono tabular-nums">
                    {budget?.totalRequested != null ? (
                      <>
                        {budget.totalRequested.toFixed(2)} <DashIcon />
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
                <Progress value={budgetUsedPct} className="h-2" />
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Remaining</span>
                  <span
                    className={
                      budget && budget.remainingAllPass < 0
                        ? "font-mono tabular-nums text-destructive"
                        : "font-mono tabular-nums text-success"
                    }
                  >
                    {budget?.remainingAllPass != null ? (
                      <>
                        {budget.remainingAllPass.toFixed(2)} <DashIcon />
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                <MiniStat
                  label="Proposals"
                  value={proposalCount != null ? proposalCount.toString() : "—"}
                />
                <MiniStat
                  label="Funded"
                  value={
                    budget?.enoughFundsCount != null
                      ? budget.enoughFundsCount.toString()
                      : "—"
                  }
                />
                <MiniStat
                  label="Quorum"
                  value={
                    budget?.enoughVotesCount != null
                      ? budget.enoughVotesCount.toString()
                      : "—"
                  }
                />
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="self-start"
              >
                <Link to="/dao">
                  Governance <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>
                <DashIcon /> Price · 24h
              </CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-xl tabular-nums text-accent">
                {usdPrice?.usd != null ? `$${usdPrice.usd.toFixed(2)}` : "—"}
                {priceChange != null && (
                  <span
                    className={
                      priceChange >= 0
                        ? "text-xs font-medium text-success"
                        : "text-xs font-medium text-destructive"
                    }
                  >
                    {priceChange >= 0 ? "+" : ""}
                    {priceChange.toFixed(2)}%
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartArea
                data={priceData}
                gradientId={`${priceSparkId}-hero`}
                yFormat={(v) => `$${Number(v).toFixed(0)}`}
                height={140}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Market Cap · 24h</CardDescription>
              <CardTitle className="text-xl tabular-nums text-accent">
                {marketCap?.usd != null ? formatCompactUsd(marketCap.usd) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartArea
                data={mcapData}
                gradientId={mcapAreaId}
                yFormat={(v) => formatCompactUsdShort(Number(v))}
                height={140}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Trading Volume · 24h</CardDescription>
              <CardTitle className="text-xl tabular-nums text-accent">
                {volumeUsd?.usd != null ? formatCompactUsd(volumeUsd.usd) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartBar
                data={volumeData}
                gradientId={volumeBarId}
                yFormat={(v) => formatCompactUsdShort(Number(v))}
                height={140}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Avg Tx per Block · 24h</CardDescription>
              <CardTitle className="text-xl tabular-nums text-accent">
                {blockTxData.length > 0
                  ? (
                      blockTxData.reduce((s, p) => s + p.value, 0) /
                      blockTxData.length
                    ).toFixed(2)
                  : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartArea
                data={blockTxData}
                gradientId={blockTxAreaId}
                yFormat={(v) => Number(v).toFixed(0)}
                height={140}
                color="var(--chart-2)"
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={<Boxes className="size-4 text-muted-foreground" />}
            label="Total Blocks"
            value={blocksTotal != null ? formatCompact(blocksTotal) : "—"}
            hint="Indexed"
          />
          <StatTile
            icon={<ArrowLeftRight className="size-4 text-muted-foreground" />}
            label="Total Tx"
            value={txsTotal != null ? formatCompact(txsTotal) : "—"}
            hint="All-time"
          />
          <StatTile
            icon={<Wallet className="size-4 text-muted-foreground" />}
            label="Avg Tx Amount"
            value={
              avgTxAmount != null ? (
                <>
                  {formatDuffs(avgTxAmount, 4)} <DashIcon />
                </>
              ) : (
                "—"
              )
            }
            hint="Last 10 tx"
          />
          <StatTile
            icon={<Vote className="size-4 text-muted-foreground" />}
            label="Active Proposals"
            value={proposalCount != null ? proposalCount.toString() : "—"}
            hint={
              budget?.enoughVotesCount != null
                ? `${budget.enoughVotesCount} pass quorum`
                : "Pending votes"
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latest Blocks</CardTitle>
            <CardDescription>The most recent blocks on chain.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm" className="h-8">
                <Link to="/blocks" search={{ page: 1, limit: 10 }}>
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {blocks.length === 0 &&
                  Array.from({ length: 6 }, (_, i) => `b-${i}`).map((k) => (
                    <TableRow key={k} className="hover:bg-transparent">
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))}
                {blocks.slice(0, 10).map((block) => (
                  <TableRow key={block.hash}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {block.txCount} txs
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {(block.size / 1024).toFixed(2)} KB
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(block.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  change,
  icon,
  sparkline,
  sparkId,
  sublabel,
}: {
  label: string;
  value: React.ReactNode;
  change?: number | null;
  icon: React.ReactNode;
  sparkline?: { i: number; value: number }[];
  sparkId?: string;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums text-accent">
          {value}
        </CardTitle>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
            {icon}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        {change != null ? (
          <Badge variant={change >= 0 ? "soft-success" : "soft-destructive"}>
            {change >= 0 ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {Math.abs(change).toFixed(2)}%
          </Badge>
        ) : sublabel ? (
          <span className="text-xs text-accent/64">{sublabel}</span>
        ) : (
          <span />
        )}
        {sparkline && sparkline.length > 1 && sparkId && (
          <ChartContainer config={chartConfig} className="aspect-auto h-8 w-24">
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
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
                fill={`url(#${sparkId})`}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "accent";
}) {
  const isAccent = tone === "accent";
  return (
    <Card
      className={
        isAccent
          ? "bg-accent text-accent-foreground justify-center"
          : "justify-center"
      }
    >
      <CardHeader>
        <CardDescription
          className={isAccent ? "text-accent-foreground/70" : ""}
        >
          {label}
        </CardDescription>
        <CardTitle
          className={
            isAccent
              ? "text-2xl tabular-nums text-accent-foreground"
              : "text-2xl tabular-nums text-accent"
          }
        >
          {value}
        </CardTitle>
        <CardAction>
          <div
            className={
              isAccent
                ? "flex size-9 items-center justify-center rounded-full bg-white/20 [&_svg]:text-accent-foreground"
                : "flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent"
            }
          >
            {icon}
          </div>
        </CardAction>
      </CardHeader>
      {hint && (
        <CardContent
          className={
            isAccent
              ? "text-xs text-accent-foreground/70 -mt-2"
              : "text-xs text-accent/64 -mt-2"
          }
        >
          {hint}
        </CardContent>
      )}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function ChartArea({
  data,
  gradientId,
  yFormat,
  height,
  color,
}: {
  data: { timestamp: number; value: number }[];
  gradientId: string;
  yFormat: (v: number | string) => string;
  height: number;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState title="No data available" className={`h-[${height}px]`} />
    );
  }
  const stroke = color ?? "var(--color-value)";
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: `${height}px` }}
    >
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
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
          width={56}
          tickFormatter={yFormat}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="value"
          type="monotone"
          stroke={stroke}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function ChartBar({
  data,
  gradientId: _gradientId,
  yFormat,
  height,
}: {
  data: { timestamp: number; value: number }[];
  gradientId: string;
  yFormat: (v: number | string) => string;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <EmptyState title="No data available" className={`h-[${height}px]`} />
    );
  }
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: `${height}px` }}
    >
      <BarChart data={data}>
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
          width={56}
          tickFormatter={yFormat}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}
