import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import {
  Activity,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowRightFromLine,
  ArrowRightToLine,
  ArrowUp,
  Box,
  Boxes,
  CheckCircle2,
  Coins,
  Crown,
  Database,
  ExternalLink,
  Gauge,
  HardDrive,
  Hourglass,
  Layers,
  Server,
  ShieldAlert,
  Vote,
} from "lucide-react";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
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
import {
  InstantLockBadge,
  MnStatusBadge,
  MnTypeBadge,
  TxTypeBadge,
} from "@/components/status-badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import type {
  ApiBlock,
  ApiGovernanceObject,
  ApiMasternode,
} from "@/lib/api/types";
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
  getIp,
  sumVOut,
} from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";
import { cn } from "@/lib/utils";

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
        masternodesQueryOptions({ network, page: 1, limit: 50 }),
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
  const priceAreaId = useId();
  const mcapAreaId = useId();
  const txsAreaId = useId();
  const blockTxAreaId = useId();
  const volumeBarId = useId();

  const { data: blocksData } = useQuery({
    ...blocksQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
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
    masternodesQueryOptions({ network, page: 1, limit: 50 }),
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

  const seenBlockHeightsRef = useRef<Set<number> | null>(null);
  const [newBlockHeights, setNewBlockHeights] = useState<Set<number>>(
    new Set(),
  );
  useEffect(() => {
    if (blocks.length === 0) return;
    const currentHeights = new Set(blocks.map((b) => b.height));
    if (seenBlockHeightsRef.current === null) {
      seenBlockHeightsRef.current = currentHeights;
      return;
    }
    const fresh = new Set<number>();
    for (const h of currentHeights) {
      if (!seenBlockHeightsRef.current.has(h)) fresh.add(h);
    }
    seenBlockHeightsRef.current = currentHeights;
    if (fresh.size === 0) return;
    setNewBlockHeights(fresh);
    const timer = setTimeout(() => setNewBlockHeights(new Set()), 1200);
    return () => clearTimeout(timer);
  }, [blocks]);

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

  const topMasternodes = useMemo(() => {
    const list = mnData?.resultSet ?? [];
    return [...list]
      .sort((a, b) => {
        const sa = getCollateral(a.type);
        const sb = getCollateral(b.type);
        if (sa !== sb) return sb - sa;
        return (b.consecutivePayments ?? 0) - (a.consecutivePayments ?? 0);
      })
      .slice(0, 7);
  }, [mnData]);

  const topProposals = useMemo(() => {
    if (!proposals) return [];
    return [...proposals]
      .sort((a, b) => (b.absoluteYesCount ?? 0) - (a.absoluteYesCount ?? 0))
      .slice(0, 6);
  }, [proposals]);

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

        <BlockTimeline
          blocks={blocks}
          newHeights={newBlockHeights}
          avgBlockTimeMs={chainStats?.blockTime ?? null}
        />

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
                gradientId={priceAreaId}
                yFormat={(v) => `$${Number(v).toFixed(0)}`}
                height={140}
                yDomain={["auto", "auto"]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Market Cap · 24h</CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-xl tabular-nums text-accent">
                {marketCap?.usd != null ? formatCompactUsd(marketCap.usd) : "—"}
                {mcapChange != null && (
                  <span
                    className={
                      mcapChange >= 0
                        ? "text-xs font-medium text-success"
                        : "text-xs font-medium text-destructive"
                    }
                  >
                    {mcapChange >= 0 ? "+" : ""}
                    {mcapChange.toFixed(2)}%
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartArea
                data={mcapData}
                gradientId={mcapAreaId}
                yFormat={(v) => formatCompactUsdShort(Number(v))}
                height={140}
                yDomain={["auto", "auto"]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Trading Volume · 24h</CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-xl tabular-nums text-accent">
                {volumeUsd?.usd != null ? formatCompactUsd(volumeUsd.usd) : "—"}
                {volumeChange != null && (
                  <span
                    className={
                      volumeChange >= 0
                        ? "text-xs font-medium text-success"
                        : "text-xs font-medium text-destructive"
                    }
                  >
                    {volumeChange >= 0 ? "+" : ""}
                    {volumeChange.toFixed(2)}%
                  </span>
                )}
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="soft" className="font-mono">
                                      <ArrowRightToLine className="size-3" />
                                      {tx.vIn?.length ?? 0}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {tx.vIn?.length ?? 0} input
                                    {(tx.vIn?.length ?? 0) === 1 ? "" : "s"}
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="soft" className="font-mono">
                                      <ArrowRightFromLine className="size-3" />
                                      {tx.vOut?.length ?? 0}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {tx.vOut?.length ?? 0} output
                                    {(tx.vOut?.length ?? 0) === 1 ? "" : "s"}
                                  </TooltipContent>
                                </Tooltip>
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

        <div className="grid gap-4 lg:grid-cols-12">
          <MasternodesListCard
            masternodes={topMasternodes}
            total={masternodeCount}
            isLoading={mnData == null}
          />
          <ProposalsListCard
            proposals={topProposals}
            total={proposalCount}
            usdPrice={usdPrice?.usd ?? null}
            isLoading={proposals == null}
          />
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
            icon={<Coins className="size-4 text-muted-foreground" />}
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
            hint="vs 18.9M cap"
          />
          <StatTile
            icon={<CheckCircle2 className="size-4 text-muted-foreground" />}
            label="Funded Proposals"
            value={
              budget?.enoughFundsCount != null
                ? budget.enoughFundsCount.toString()
                : "—"
            }
            hint={
              budget?.enoughFundsTotal != null
                ? `${budget.enoughFundsTotal.toFixed(0)} DASH allocated`
                : "Next superblock payout"
            }
          />
        </div>
      </div>
    </div>
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
  yDomain,
}: {
  data: { timestamp: number; value: number }[];
  gradientId: string;
  yFormat: (v: number | string) => string;
  height: number;
  color?: string;
  yDomain?: [number | string, number | string];
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
          domain={yDomain}
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

const PENDING_BLOCK_COUNT = 3;
const FALLBACK_BLOCK_TIME_MS = 150_000;
const MAX_MINED_BLOCKS = 7;

function formatBlockEta(ms: number) {
  if (ms <= 0) return "any moment";
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `~ ${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 10 && seconds > 0) return `~ ${minutes}m ${seconds}s`;
  return `~ ${minutes}m`;
}

function blockTimestampMs(timestamp: string): number {
  if (/^\d+$/.test(timestamp)) return Number(timestamp) * 1000;
  const ms = new Date(timestamp).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function BlockTimeline({
  blocks,
  newHeights,
  avgBlockTimeMs,
}: {
  blocks: ApiBlock[];
  newHeights: Set<number>;
  avgBlockTimeMs: number | null;
}) {
  const minedSorted = useMemo(
    () =>
      [...blocks]
        .sort((a, b) => b.height - a.height)
        .slice(0, MAX_MINED_BLOCKS),
    [blocks],
  );
  const minedRendered = useMemo(
    () => [...minedSorted].reverse(),
    [minedSorted],
  );

  const latestBlock = minedSorted[0];
  const blockTimeMs =
    avgBlockTimeMs && avgBlockTimeMs > 0
      ? avgBlockTimeMs
      : FALLBACK_BLOCK_TIME_MS;
  const lastMinedAtMs = latestBlock
    ? blockTimestampMs(latestBlock.timestamp)
    : null;

  const pending = useMemo(() => {
    if (!latestBlock || lastMinedAtMs == null) return [];
    return Array.from({ length: PENDING_BLOCK_COUNT }, (_, i) => ({
      height: latestBlock.height + i + 1,
      etaAt: lastMinedAtMs + blockTimeMs * (i + 1),
    }));
  }, [latestBlock, lastMinedAtMs, blockTimeMs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Latest Blocks
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
        </CardTitle>
        <CardDescription>
          Recently mined blocks and upcoming mining slots.
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link to="/blocks" search={{ page: 1, limit: 10 }}>
              View all <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-stretch">
          <div
            className="relative flex basis-0 items-stretch gap-3 sm:gap-4"
            style={{ flexGrow: Math.max(MAX_MINED_BLOCKS, 1) }}
          >
            {minedRendered.length > 0 && (
              <ChainOverlay count={minedRendered.length} />
            )}
            {minedRendered.length === 0
              ? Array.from({ length: 5 }, (_, i) => `bs-${i}`).map((k) => (
                  <Skeleton key={k} className="h-24 flex-1 rounded-md" />
                ))
              : minedRendered.map((block) => (
                  <MinedBlockTile
                    key={block.hash}
                    hash={block.hash}
                    height={block.height}
                    txCount={block.txCount}
                    size={block.size}
                    timestamp={block.timestamp}
                    isNew={newHeights.has(block.height)}
                  />
                ))}
          </div>

          <div
            aria-hidden
            className="mx-3 self-stretch border-l border-dashed border-border sm:mx-4"
          />

          <div
            className="flex basis-0 items-stretch gap-3 sm:gap-4"
            style={{ flexGrow: PENDING_BLOCK_COUNT }}
          >
            {pending.map((p) => (
              <PendingBlockTile
                key={p.height}
                height={p.height}
                etaAt={p.etaAt}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const ChainOverlay = memo(_ChainOverlay);
function _ChainOverlay({ count }: { count: number }) {
  if (count < 1) return null;
  const nodes = Array.from(
    { length: count },
    (_, i) => `${((i + 0.5) / count) * 100}%`,
  );
  const lastNode = nodes[nodes.length - 1];
  return (
    <svg
      aria-hidden
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-24 h-3 w-full overflow-visible"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 6%, black 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 6%, black 100%)",
      }}
    >
      <title>Block chain</title>
      <g className="animate-chain-flow">
        <line
          x1="-8"
          x2={lastNode}
          y1="50%"
          y2="50%"
          stroke="var(--accent)"
          strokeOpacity="0.55"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
      </g>
      {nodes.map((cx) => (
        <g key={cx}>
          <circle
            cx={cx}
            cy="50%"
            r="5"
            fill="color-mix(in oklab, var(--accent) 18%, transparent)"
          />
          <circle cx={cx} cy="50%" r="2.5" fill="var(--accent)" />
        </g>
      ))}
    </svg>
  );
}

const MinedBlockTile = memo(_MinedBlockTile);
function _MinedBlockTile({
  hash,
  height,
  txCount,
  size,
  timestamp,
  isNew,
}: {
  hash: string;
  height: number;
  txCount: number;
  size: number;
  timestamp: string;
  isNew: boolean;
}) {
  return (
    <Link
      to="/blocks/$hashOrHeight"
      params={{ hashOrHeight: hash }}
      className={cn(
        "group flex flex-1 min-w-0 flex-col items-stretch gap-3 no-underline",
        isNew && "animate-block-mint",
      )}
    >
      <div className="block-cube flex h-24 flex-col justify-between rounded-md p-3 transition-transform group-hover:-translate-y-0.5">
        <span className="font-mono text-sm font-semibold tabular-nums">
          #{height.toLocaleString()}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-semibold tabular-nums leading-none">
            {txCount}
          </span>
          <span className="text-[10px] uppercase tracking-wider opacity-70">
            tx
          </span>
        </div>
        <span className="font-mono text-[10px] tabular-nums opacity-70">
          {(size / 1024).toFixed(2)} KB
        </span>
      </div>
      <span className="text-center text-[10px] tabular-nums whitespace-nowrap text-muted-foreground">
        {formatRelativeTime(timestamp)}
      </span>
    </Link>
  );
}

function PendingBlockTile({
  height,
  etaAt,
}: {
  height: number;
  etaAt: number;
}) {
  const [etaMs, setEtaMs] = useState(() => Math.max(0, etaAt - Date.now()));
  useEffect(() => {
    setEtaMs(Math.max(0, etaAt - Date.now()));
    const id = setInterval(() => {
      setEtaMs(Math.max(0, etaAt - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [etaAt]);
  return (
    <div className="flex flex-1 min-w-0 flex-col items-stretch gap-3">
      <div className="block-cube-pending flex h-24 flex-col justify-between rounded-md p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums text-accent">
            #{height.toLocaleString()}
          </span>
          <Box className="size-3.5 text-accent/70" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-accent/70">
          Pending
        </span>
      </div>
      <span className="text-center text-[10px] tabular-nums whitespace-nowrap text-muted-foreground">
        {formatBlockEta(etaMs)}
      </span>
    </div>
  );
}

function getCollateral(type: string): number {
  const t = type.toLowerCase();
  if (t === "evo" || t === "highperformance") return 4000;
  return 1000;
}

function MasternodesListCard({
  masternodes,
  total,
  isLoading,
}: {
  masternodes: ApiMasternode[];
  total: number | null;
  isLoading: boolean;
}) {
  return (
    <Card className="lg:col-span-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Top Masternodes
          <Badge variant="soft-accent" className="font-mono">
            <Crown className="size-3" />
            Highest staked
          </Badge>
        </CardTitle>
        <CardDescription>
          {total != null
            ? `Sample from ${formatCompact(total)} active nodes`
            : "Active validators sorted by collateral"}
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link to="/masternodes">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }, (_, i) => `mn-${i}`).map((k) => (
                <TableRow key={k} className="hover:bg-transparent">
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && masternodes.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={2}>
                  <EmptyState title="No masternodes" />
                </TableCell>
              </TableRow>
            )}
            {masternodes.map((mn) => {
              const stake = getCollateral(mn.type);
              const penalty = mn.posPenaltyScore ?? 0;
              return (
                <TableRow key={mn.proTxHash}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        username={mn.proTxHash}
                        className="size-9 shrink-0"
                      />
                      <div className="flex min-w-0 flex-col gap-1">
                        <Link
                          to="/masternodes/$hash"
                          params={{ hash: mn.proTxHash }}
                          className="truncate font-mono text-sm font-medium hover:text-accent"
                        >
                          {getIp(mn.address)}
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <MnTypeBadge type={mn.type} />
                          <MnStatusBadge status={mn.status} />
                          {penalty > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="soft-destructive"
                                  className="font-mono"
                                >
                                  <ShieldAlert className="size-3" />
                                  {penalty}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                PoSe penalty score
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-mono text-sm font-medium tabular-nums text-accent">
                        {stake.toLocaleString()} <DashIcon />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {mn.lastPaidTime
                          ? `Paid ${formatRelativeTime(mn.lastPaidTime)}`
                          : "Never paid"}
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
  );
}

function ProposalsListCard({
  proposals,
  total,
  usdPrice,
  isLoading,
}: {
  proposals: ApiGovernanceObject[];
  total: number | null;
  usdPrice: number | null;
  isLoading: boolean;
}) {
  return (
    <Card className="lg:col-span-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Active Proposals
          {total != null && (
            <Badge variant="soft" className="font-mono">
              {total}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>DAO governance · sorted by net votes</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link to="/dao">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => `pr-${i}`).map((k) => (
                <TableRow key={k} className="hover:bg-transparent">
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-2 w-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && proposals.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3}>
                  <EmptyState title="No proposals" />
                </TableCell>
              </TableRow>
            )}
            {proposals.map((p) => (
              <ProposalRow
                key={p.hash ?? p.collateralHash ?? p.data?.name ?? "p"}
                proposal={p}
                usdPrice={usdPrice}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProposalRow({
  proposal,
  usdPrice,
}: {
  proposal: ApiGovernanceObject;
  usdPrice: number | null;
}) {
  const name = proposal.data?.name ?? "Untitled";
  const url = proposal.data?.url ?? null;
  const yes = proposal.yesCount ?? 0;
  const no = proposal.noCount ?? 0;
  const net = proposal.absoluteYesCount ?? yes - no;
  const total = Math.max(yes + no, 1);
  const yesPct = (yes / total) * 100;
  const isPassing = net > 0;
  const amount = proposal.data?.paymentAmount ?? null;
  return (
    <TableRow>
      <TableCell className="max-w-[200px]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
            <Vote className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate text-sm font-medium">{name}</span>
                </TooltipTrigger>
                <TooltipContent>{name}</TooltipContent>
              </Tooltip>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-accent"
                  aria-label="Proposal link"
                >
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <Badge
              variant={isPassing ? "soft-success" : "soft-destructive"}
              className="w-fit font-mono"
            >
              {isPassing ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <ArrowDown className="size-3" />
              )}
              {isPassing ? "Passing" : "Failing"}
            </Badge>
          </div>
        </div>
      </TableCell>
      <TableCell className="min-w-[140px]">
        <div className="flex flex-col gap-1.5">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-success/70 transition-all"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="bg-destructive/40 transition-all"
              style={{ width: `${100 - yesPct}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
            <span className="text-success/80">{yes.toLocaleString()}</span>
            <span
              className={
                net >= 0
                  ? "font-medium text-success"
                  : "font-medium text-destructive"
              }
            >
              {net >= 0 ? "+" : ""}
              {net.toLocaleString()}
            </span>
            <span className="text-destructive/80">{no.toLocaleString()}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-sm font-medium tabular-nums text-accent">
            {amount != null ? amount.toLocaleString() : "—"} <DashIcon />
          </span>
          <span className="text-xs text-muted-foreground">
            {amount != null && usdPrice != null
              ? `≈ ${formatCompactUsd(amount * usdPrice)}`
              : "—"}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
