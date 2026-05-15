import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
  CalendarClock,
  CheckCircle2,
  Coins,
  Crown,
  Database,
  ExternalLink,
  Flame,
  Gauge,
  HardDrive,
  Hourglass,
  Layers,
  Radio,
  Server,
  ShieldAlert,
  Trophy,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import { DashIcon } from "@/components/dash-icon";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { richListQueryOptions } from "@/lib/api/addresses";
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
  transactionsBreakdown24hQueryOptions,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type {
  ApiAddressBalanceEntry,
  ApiBlock,
  ApiGovernanceObject,
  ApiMasternode,
} from "@/lib/api/types";
import {
  volumeHistoricalQueryOptions,
  volumeQueryOptions,
} from "@/lib/api/volume";
import {
  DUFFS_PER_DASH,
  formatCompact,
  formatCompactUsd,
  formatCompactUsdShort,
  formatDuffs,
  formatDurationParts,
  formatHashRate,
  formatRelativeTime,
  getIp,
  sumVOut,
} from "@/lib/format";
import {
  getBlocksUntilVotingDeadline,
  getMsUntilVotingDeadline,
  getNextSuperblockHeight,
  getPreviousSuperblockHeight,
  getVotingDeadlineHeight,
  getVotingProgress,
} from "@/lib/governance";
import { appStore, type Network } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ConcentrationBanner } from "@/themes/neo/components/concentration-banner";
import { EmptyState } from "@/themes/neo/components/empty-state";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { LiveTicker } from "@/themes/neo/components/live-ticker";
import { MasternodeMap } from "@/themes/neo/components/masternode-map";
import {
  InstantLockBadge,
  MnStatusBadge,
  MnTypeBadge,
  TxTypeBadge,
} from "@/themes/neo/components/status-badge";
import { TxBreakdownCard } from "@/themes/neo/components/tx-breakdown-card";
import { Badge } from "@/themes/neo/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";

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

export default function RedesignDashboardPage() {
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
  const { data: chainStats } = useQuery({
    ...chainStatsQueryOptions({ network }),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  const { data: budget } = useQuery(budgetQueryOptions({ network }));
  const { data: proposals } = useQuery(proposalsQueryOptions({ network }));
  const { data: mempoolData } = useQuery(
    mempoolQueryOptions({ network, page: 1, limit: 1 }),
  );
  const { data: richList } = useQuery(
    richListQueryOptions({ network, page: 1, limit: 10, order: "desc" }),
  );
  const { data: txBreakdown } = useQuery({
    ...transactionsBreakdown24hQueryOptions({ network }),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

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

  const priceRange = useMemo(() => {
    if (priceData.length === 0) return null;
    const vals = priceData.map((p) => p.value);
    return { high: Math.max(...vals), low: Math.min(...vals) };
  }, [priceData]);
  const mcapRange = useMemo(() => {
    if (mcapData.length === 0) return null;
    const vals = mcapData.map((p) => p.value);
    return { high: Math.max(...vals), low: Math.min(...vals) };
  }, [mcapData]);
  const volumeRange = useMemo(() => {
    if (volumeData.length === 0) return null;
    const vals = volumeData.map((p) => p.value);
    return { high: Math.max(...vals), low: Math.min(...vals) };
  }, [volumeData]);
  const blockTxRange = useMemo(() => {
    if (blockTxData.length === 0) return null;
    const vals = blockTxData.map((p) => p.value);
    return { high: Math.max(...vals), low: Math.min(...vals) };
  }, [blockTxData]);

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
        <DashboardHero
          network={network}
          latestHeight={chainStats?.latestHeight ?? latestBlock?.height ?? null}
          blockTimeMs={chainStats?.blockTime ?? null}
          usdPrice={usdPrice?.usd ?? null}
          priceChange={priceChange}
          marketCapUsd={marketCap?.usd ?? null}
          tps={chainStats?.transactionsPerSecond ?? null}
        />

        <BlockTimeline
          blocks={blocks}
          newHeights={newBlockHeights}
          avgBlockTimeMs={chainStats?.blockTime ?? null}
        />

        <LiveTicker txs={txs} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="chart-card chart-card--blue">
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <DashIcon /> Price · 24h
              </CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-xl tabular-nums text-[color:var(--accent)]">
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
                color="var(--accent)"
                yDomain={["auto", "auto"]}
              />
              {priceRange && (
                <ChartMicroLabels
                  accent="var(--accent)"
                  highLabel="ATH"
                  lowLabel="Low"
                  high={`$${priceRange.high.toFixed(2)}`}
                  low={`$${priceRange.low.toFixed(2)}`}
                />
              )}
            </CardContent>
          </Card>

          <Card className="chart-card chart-card--violet">
            <CardHeader>
              <CardDescription>Market Cap · 24h</CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-xl tabular-nums text-[color:var(--accent-violet)]">
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
                color="var(--accent-violet)"
                yDomain={["auto", "auto"]}
              />
              {mcapRange && (
                <ChartMicroLabels
                  accent="var(--accent-violet)"
                  highLabel="ATH"
                  lowLabel="Low"
                  high={formatCompactUsdShort(mcapRange.high)}
                  low={formatCompactUsdShort(mcapRange.low)}
                />
              )}
            </CardContent>
          </Card>

          <Card className="chart-card chart-card--teal">
            <CardHeader>
              <CardDescription>Trading Volume · 24h</CardDescription>
              <CardTitle className="flex items-baseline gap-2 text-xl tabular-nums text-[color:var(--accent-teal)]">
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
                color="var(--accent-teal)"
              />
              {volumeRange && (
                <ChartMicroLabels
                  accent="var(--accent-teal)"
                  highLabel="Peak"
                  lowLabel="Low"
                  high={formatCompactUsdShort(volumeRange.high)}
                  low={formatCompactUsdShort(volumeRange.low)}
                />
              )}
            </CardContent>
          </Card>

          <Card className="chart-card chart-card--lime">
            <CardHeader>
              <CardDescription>Avg Tx per Block · 24h</CardDescription>
              <CardTitle className="text-xl tabular-nums text-[color:var(--accent-lime)]">
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
                color="var(--accent-lime)"
              />
              {blockTxRange && (
                <ChartMicroLabels
                  accent="var(--accent-lime)"
                  highLabel="Peak"
                  lowLabel="Min"
                  high={blockTxRange.high.toFixed(0)}
                  low={blockTxRange.low.toFixed(0)}
                />
              )}
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
                        className={cn(
                          "row-lift",
                          isNew &&
                            "animate-in slide-in-from-top-2 fade-in duration-500 animate-tx-flash",
                        )}
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
              icon={<Zap className="size-4 text-muted-foreground" />}
              label="Hash Rate"
              value={formatHashRate(chainStats?.hashRate ?? null)}
              hint="Avg over last 120 blocks"
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

        <StatStrip
          items={[
            {
              icon: <Activity className="size-4" />,
              label: "Live TPS",
              value: chainStats?.transactionsPerSecond ?? null,
              format: (v) => v.toFixed(2),
              hint:
                chainStats?.transactionsPerMinute != null
                  ? `${chainStats.transactionsPerMinute.toFixed(1)} /min`
                  : "Avg over 20 blocks",
              accent: "var(--accent)",
            },
            {
              icon: <Hourglass className="size-4" />,
              label: "Avg Block Time",
              value: chainStats?.blockTime ?? null,
              format: (v) => `${(v / 1000).toFixed(0)}s`,
              hint: "Across last 20 blocks",
              accent: "var(--accent-violet)",
            },
            {
              icon: <Database className="size-4" />,
              label: "Mempool",
              value: mempoolCount,
              format: (v) => formatCompact(v),
              hint: "Pending tx",
              accent: "var(--accent-teal)",
            },
            {
              icon: <Boxes className="size-4" />,
              label: "Avg Block Size",
              value: avgBlockSize,
              format: (v) => formatBytes(v),
              hint: `Last ${blocks.length || 0} blocks`,
              accent: "var(--accent-lime)",
            },
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5">
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

          <TxBreakdownCard
            breakdown={txBreakdown ?? null}
            isLoading={txBreakdown == null}
            className="lg:col-span-4"
          />

          <Card className="lg:col-span-3 bg-gradient-to-br from-card to-secondary/40">
            <CardHeader>
              <CardDescription>DAO Treasury</CardDescription>
              <CardTitle className="flex items-baseline gap-3 text-2xl tabular-nums text-accent">
                {budget?.totalBudget != null ? (
                  <span>
                    {budget.totalBudget.toFixed(2)} <DashIcon />
                  </span>
                ) : (
                  "—"
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

        <div className="grid gap-4 lg:grid-cols-12">
          <TopHoldersCard
            entries={richList?.resultSet ?? []}
            total={richList?.pagination?.total ?? null}
            usdPrice={usdPrice?.usd ?? null}
            isLoading={richList == null}
          />
          <div className="lg:col-span-5 flex flex-col gap-4">
            <NextSuperblockCard
              nextHeight={chainStats?.nextSuperblockHeight ?? null}
              prevHeight={chainStats?.latestSuperblockHeight ?? null}
              latestHeight={
                chainStats?.latestHeight ?? latestBlock?.height ?? null
              }
              blockTimeMs={chainStats?.blockTime ?? null}
              budgetDash={budget?.totalBudget ?? null}
              usdPrice={usdPrice?.usd ?? null}
              network={network}
              className="lg:col-span-12 flex-1"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <StatTile
                icon={<Boxes className="size-4 text-muted-foreground" />}
                label="Total Blocks"
                value={blocksTotal != null ? formatCompact(blocksTotal) : "—"}
                hint="Indexed"
              />
              <StatTile
                icon={
                  <ArrowLeftRight className="size-4 text-muted-foreground" />
                }
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

        <MasternodeMap variant="dashboard" />
      </div>
    </div>
  );
}

function useCountUp(target: number | null, duration = 900) {
  const [val, setVal] = useState<number>(0);
  const lastTargetRef = useRef<number | null>(null);
  useEffect(() => {
    if (target == null) return;
    const from = lastTargetRef.current ?? 0;
    const to = target;
    if (from === to) {
      setVal(to);
      return;
    }
    lastTargetRef.current = to;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setVal(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function StatStripValue({
  value,
  format,
}: {
  value: number | null;
  format: (v: number) => string;
}) {
  const animated = useCountUp(value);
  if (value == null) return "—";
  return <>{format(animated)}</>;
}

type StatStripItem = {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  format: (v: number) => string;
  hint?: string;
  accent: string;
};

function StatStrip({ items }: { items: StatStripItem[] }) {
  return (
    <div className="stat-strip relative grid grid-cols-2 overflow-hidden rounded-xl border border-border/60 shadow-card sm:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "stat-strip__cell group flex items-center gap-3 px-4 py-4 sm:px-5",
            i > 0 && "sm:border-l border-border/40",
            i >= 2 && "border-t sm:border-t-0 border-border/40",
          )}
          style={{ ["--cell-accent" as string]: item.accent }}
        >
          <div
            className="stat-strip__icon flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `color-mix(in oklab, ${item.accent} 14%, transparent)`,
              color: item.accent,
            }}
          >
            {item.icon}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </span>
            <span
              className="font-display-num text-2xl leading-none"
              style={{ color: item.accent }}
            >
              <StatStripValue value={item.value} format={item.format} />
            </span>
            {item.hint && (
              <span className="text-[11px] text-muted-foreground">
                {item.hint}
              </span>
            )}
          </div>
        </div>
      ))}
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

function ChartValuePill({
  active,
  payload,
  yFormat,
  color,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { timestamp: number } }>;
  yFormat: (v: number | string) => string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/95 px-3 py-1.5 text-xs shadow-floating backdrop-blur">
      <span
        className="size-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {yFormat(item.value)}
      </span>
      <span className="text-muted-foreground">
        {new Date(item.payload.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </span>
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
  showLastDot = true,
}: {
  data: { timestamp: number; value: number }[];
  gradientId: string;
  yFormat: (v: number | string) => string;
  height: number;
  color?: string;
  yDomain?: [number | string, number | string];
  showLastDot?: boolean;
}) {
  if (data.length === 0) {
    return (
      <Skeleton
        className="w-full"
        style={{ height: `${height}px` }}
        aria-label="Loading chart"
      />
    );
  }
  const stroke = color ?? "var(--color-value)";
  const lastIdx = data.length - 1;
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: `${height}px` }}
    >
      <AreaChart
        data={data}
        margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.42} />
            <stop offset="60%" stopColor={stroke} stopOpacity={0.12} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="color-mix(in oklab, var(--foreground) 12%, transparent)"
        />
        <XAxis
          dataKey="timestamp"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
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
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={yFormat}
          domain={yDomain}
        />
        <ChartTooltip
          cursor={{
            stroke,
            strokeWidth: 1,
            strokeDasharray: "3 3",
            strokeOpacity: 0.55,
          }}
          content={(props) => (
            <ChartValuePill
              active={props.active}
              payload={
                props.payload as Array<{
                  value: number;
                  payload: { timestamp: number };
                }>
              }
              yFormat={yFormat}
              color={stroke}
            />
          )}
        />
        <Area
          dataKey="value"
          type="monotone"
          stroke={stroke}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
          dot={
            showLastDot
              ? // biome-ignore lint/suspicious/noExplicitAny: recharts dot props
                (props: any) => {
                  const { cx, cy, index } = props;
                  if (index !== lastIdx)
                    return <g key={`d-${index}`} display="none" />;
                  return (
                    <g key={`d-${index}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={9}
                        fill={stroke}
                        opacity={0.15}
                      >
                        <animate
                          attributeName="r"
                          values="7;11;7"
                          dur="2.4s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.18;0.04;0.18"
                          dur="2.4s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3.5}
                        fill={stroke}
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    </g>
                  );
                }
              : false
          }
          activeDot={{
            r: 5,
            stroke: "var(--background)",
            strokeWidth: 2,
            fill: stroke,
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function ChartBar({
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
      <Skeleton
        className="w-full"
        style={{ height: `${height}px` }}
        aria-label="Loading chart"
      />
    );
  }
  const fill = color ?? "var(--color-value)";
  const lastIdx = data.length - 1;
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: `${height}px` }}
    >
      <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.95} />
            <stop offset="100%" stopColor={fill} stopOpacity={0.45} />
          </linearGradient>
          <linearGradient id={`${gradientId}-last`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={1} />
            <stop offset="100%" stopColor={fill} stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="color-mix(in oklab, var(--foreground) 12%, transparent)"
        />
        <XAxis
          dataKey="timestamp"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
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
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={yFormat}
        />
        <ChartTooltip
          cursor={{ fill, opacity: 0.08 }}
          content={(props) => (
            <ChartValuePill
              active={props.active}
              payload={
                props.payload as Array<{
                  value: number;
                  payload: { timestamp: number };
                }>
              }
              yFormat={yFormat}
              color={fill}
            />
          )}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={`b-${entry.timestamp}`}
              fill={
                i === lastIdx
                  ? `url(#${gradientId}-last)`
                  : `url(#${gradientId})`
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function ChartMicroLabels({
  high,
  low,
  highLabel = "High",
  lowLabel = "Low",
  accent,
}: {
  high: string;
  low: string;
  highLabel?: string;
  lowLabel?: string;
  accent?: string;
}) {
  return (
    <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/80">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full"
          style={{ background: accent ?? "var(--accent)" }}
        />
        {highLabel}
        <span className="font-mono normal-case tracking-normal text-foreground/80">
          {high}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        {lowLabel}
        <span className="font-mono normal-case tracking-normal text-foreground/80">
          {low}
        </span>
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      </span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function DashboardHero({
  network,
  latestHeight,
  blockTimeMs,
  usdPrice,
  priceChange,
  marketCapUsd,
  tps,
}: {
  network: "mainnet" | "testnet";
  latestHeight: number | null;
  blockTimeMs: number | null;
  usdPrice: number | null;
  priceChange: number | null;
  marketCapUsd: number | null;
  tps: number | null;
}) {
  const [tickKey, setTickKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const prevHeightRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (latestHeight == null) return;
    if (prevHeightRef.current == null) {
      prevHeightRef.current = latestHeight;
      return;
    }
    if (latestHeight !== prevHeightRef.current) {
      prevHeightRef.current = latestHeight;
      setTickKey((k) => k + 1);
    }
  }, [latestHeight]);

  const showLive = mounted;
  const liveHeight = showLive ? latestHeight : null;
  const livePrice = showLive ? usdPrice : null;
  const livePriceChange = showLive ? priceChange : null;
  const liveMcap = showLive ? marketCapUsd : null;
  const liveTps = showLive ? tps : null;
  const liveBlockTimeMs = showLive ? blockTimeMs : null;

  const networkLabel = network === "mainnet" ? "Mainnet" : "Testnet";
  const blockTimeSec =
    liveBlockTimeMs != null && liveBlockTimeMs > 0
      ? (liveBlockTimeMs / 1000).toFixed(0)
      : null;

  return (
    <Card className="hero-surface relative overflow-hidden border-border/60 shadow-floating">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-status-ping rounded-full bg-success" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              {networkLabel} · Operational
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
              <DashIcon />
              <span className="tabular-nums text-foreground">
                {livePrice != null ? `$${livePrice.toFixed(2)}` : "—"}
              </span>
              {livePriceChange != null && (
                <span
                  className={cn(
                    "tabular-nums",
                    livePriceChange >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {livePriceChange >= 0 ? "+" : ""}
                  {livePriceChange.toFixed(2)}%
                </span>
              )}
            </span>
            {liveMcap != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span>MCap</span>
                <span className="tabular-nums text-foreground">
                  {formatCompactUsdShort(liveMcap)}
                </span>
              </span>
            )}
            {liveTps != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Radio className="size-3 text-accent" />
                <span className="tabular-nums text-foreground">
                  {liveTps.toFixed(2)}
                </span>
                <span>tps</span>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Welcome to #1
            </p>
            <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              <span className="text-accent">Dash</span>{" "}
              <span className="text-foreground">Network Explorer</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Live blocks, transactions, masternodes & DAO governance — streamed
              straight from the chain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="shadow-card">
              <Link to="/blocks" search={{ page: 1, limit: 10 }}>
                Explore blocks <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/dao">Governance</Link>
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Live Block Height
            </span>
            <div className="flex items-baseline gap-3">
              <span
                key={tickKey}
                className="font-display-num text-5xl text-foreground sm:text-6xl animate-hero-tick"
              >
                {liveHeight != null ? liveHeight.toLocaleString("en-US") : "—"}
              </span>
              {tickKey > 0 && (
                <span
                  key={`badge-${tickKey}`}
                  className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success animate-in fade-in slide-in-from-bottom-1 duration-500"
                >
                  <ArrowUp className="size-3" />
                  new
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {blockTimeSec != null
                ? `Avg ${blockTimeSec}s · next block any moment`
                : "Streaming on-chain"}
            </span>
          </div>

          <div className="relative h-20 w-full overflow-hidden rounded-md border border-border/40 bg-background/40">
            <ChainPulse />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ChainPulse() {
  const gradId = useId();
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 80"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
    >
      <title>Chain pulse</title>
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 40 L30 40 L40 22 L60 58 L80 30 L100 50 L120 18 L140 60 L160 28 L180 48 L200 36 L240 40"
        fill="none"
        stroke="color-mix(in oklab, var(--accent) 28%, transparent)"
        strokeWidth="1.5"
      />
      <path
        d="M0 40 L30 40 L40 22 L60 58 L80 30 L100 50 L120 18 L140 60 L160 28 L180 48 L200 36 L240 40"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeDasharray="120 360"
        className="animate-hero-pulse-flow"
      />
    </svg>
  );
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
    <Card className="timeline-surface relative overflow-hidden border-border/60 shadow-floating">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl sm:text-3xl">
          Block Timeline
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
        </CardTitle>
        <CardDescription>
          Recently mined blocks and upcoming mining slots — streaming live.
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
        <div className="flex items-stretch pt-2">
          <div
            className="relative flex basis-0 items-stretch gap-3 sm:gap-4"
            style={{ flexGrow: Math.max(MAX_MINED_BLOCKS, 1) }}
          >
            {minedRendered.length > 0 && (
              <ChainOverlay count={minedRendered.length} />
            )}
            {minedRendered.length === 0
              ? Array.from({ length: 5 }, (_, i) => `bs-${i}`).map((k) => (
                  <Skeleton key={k} className="h-32 flex-1 rounded-md" />
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
  const nodeXs = Array.from(
    { length: count },
    (_, i) => ((i + 0.5) / count) * 100,
  );
  const lastNodePct = nodeXs[nodeXs.length - 1];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-32 h-4 w-full"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
      }}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: `${lastNodePct}%` }}
      >
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[color-mix(in_oklab,var(--accent)_55%,transparent)]" />
      </div>
      {nodeXs.map((cx) => (
        <div
          key={cx}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${cx}%` }}
        >
          <span className="absolute left-1/2 top-1/2 block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,var(--accent)_18%,transparent)]" />
          <span className="block size-1.5 rounded-full bg-accent" />
        </div>
      ))}
    </div>
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
  const shortHash = `${hash.slice(0, 8)}…${hash.slice(-6)}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/blocks/$hashOrHeight"
          params={{ hashOrHeight: hash }}
          className={cn(
            "group flex flex-1 min-w-0 flex-col items-stretch gap-3 no-underline",
            isNew && "animate-block-mint",
          )}
        >
          <div className="block-cube flex h-32 flex-col justify-between rounded-md p-3 transition-transform group-hover:-translate-y-1">
            <div className="relative z-[2] flex items-center justify-between gap-1">
              <span className="font-mono text-sm font-semibold tabular-nums">
                #{height.toLocaleString()}
              </span>
            </div>
            <div className="relative z-[2] flex items-baseline gap-1.5">
              <span className="font-display-num text-2xl tabular-nums">
                {txCount}
              </span>
              <span className="text-[10px] uppercase tracking-wider opacity-75">
                tx
              </span>
            </div>
            <span className="relative z-[2] font-mono text-[10px] tabular-nums opacity-75">
              {(size / 1024).toFixed(2)} KB
            </span>
          </div>
          <span className="text-center text-[10px] tabular-nums whitespace-nowrap text-muted-foreground">
            {formatRelativeTime(timestamp)}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="min-w-[220px] border border-border/60 bg-popover p-3 text-popover-foreground shadow-floating"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-sm">
              Block #{height.toLocaleString()}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatRelativeTime(timestamp)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums">
            <span className="text-muted-foreground">Txs</span>
            <span className="text-right">{txCount.toLocaleString()}</span>
            <span className="text-muted-foreground">Size</span>
            <span className="text-right">{formatBytes(size)}</span>
            <span className="text-muted-foreground">Hash</span>
            <span className="text-right text-accent">{shortHash}</span>
          </div>
          <span className="border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground">
            Click to open block details
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
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
      <div className="block-cube-pending flex h-32 flex-col justify-between rounded-md p-3">
        <div className="relative z-[2] flex items-baseline justify-between gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums text-accent">
            #{height.toLocaleString()}
          </span>
          <Box className="size-3.5 text-accent/70" />
        </div>
        <span className="relative z-[2] font-display-num text-xl tabular-nums text-accent/80">
          {formatBlockEta(etaMs)}
        </span>
        <span className="relative z-[2] text-[10px] font-medium uppercase tracking-wider text-accent/70">
          Pending
        </span>
      </div>
      <span className="text-center text-[10px] tabular-nums whitespace-nowrap text-muted-foreground">
        eta
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
                <TableRow key={mn.proTxHash} className="row-lift">
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
    <TableRow className="row-lift">
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

function NextSuperblockCard({
  nextHeight,
  prevHeight,
  latestHeight,
  blockTimeMs,
  budgetDash,
  usdPrice,
  network,
  className,
}: {
  nextHeight: number | null;
  prevHeight: number | null;
  latestHeight: number | null;
  blockTimeMs: number | null;
  budgetDash: number | null;
  usdPrice: number | null;
  network: Network;
  className?: string;
}) {
  const resolvedNext =
    nextHeight ??
    (latestHeight != null
      ? getNextSuperblockHeight(latestHeight, network)
      : null);
  const resolvedPrev =
    prevHeight ??
    (latestHeight != null
      ? getPreviousSuperblockHeight(latestHeight, network)
      : null);
  const blocksLeft =
    resolvedNext != null && latestHeight != null
      ? Math.max(0, resolvedNext - latestHeight)
      : null;
  const totalBlocks =
    resolvedNext != null && resolvedPrev != null
      ? Math.max(1, resolvedNext - resolvedPrev)
      : null;
  const sbProgress =
    blocksLeft != null && totalBlocks != null
      ? Math.min(1, Math.max(0, 1 - blocksLeft / totalBlocks))
      : 0;
  const etaMs =
    blocksLeft != null && blockTimeMs != null && blockTimeMs > 0
      ? blocksLeft * blockTimeMs
      : null;
  const voteHeight =
    latestHeight != null
      ? getVotingDeadlineHeight(latestHeight, network)
      : null;
  const voteProgress =
    latestHeight != null ? getVotingProgress(latestHeight, network) : 0;
  const voteBlocksLeft =
    latestHeight != null
      ? getBlocksUntilVotingDeadline(latestHeight, network)
      : null;
  const voteMs =
    latestHeight != null && blockTimeMs != null
      ? getMsUntilVotingDeadline(latestHeight, network, blockTimeMs)
      : null;
  const votingClosed = voteBlocksLeft != null && voteBlocksLeft <= 0;
  return (
    <Card
      className={cn(
        "lg:col-span-3 bg-gradient-to-br from-card to-secondary/40",
        className,
      )}
    >
      <CardHeader>
        <CardDescription>Next Superblock</CardDescription>
        <CardTitle className="text-2xl tabular-nums text-accent">
          {resolvedNext != null ? `#${resolvedNext.toLocaleString()}` : "—"}
        </CardTitle>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
            <Flame className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-5 pb-5">
        <div className="flex flex-1 items-center justify-around gap-4">
          <CountdownDial
            label="Voting closes"
            subLabel={
              votingClosed
                ? "Closed"
                : voteHeight != null
                  ? `#${voteHeight.toLocaleString()}`
                  : "—"
            }
            ms={voteMs}
            progress={voteProgress}
            accent="var(--accent-violet)"
            icon={<Vote className="size-3" />}
            closed={votingClosed}
          />
          <CountdownDial
            label="Next superblock"
            subLabel={
              resolvedNext != null ? `#${resolvedNext.toLocaleString()}` : "—"
            }
            ms={etaMs}
            progress={sbProgress}
            accent="var(--accent)"
            icon={<CalendarClock className="size-3" />}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-4 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">Budget</span>
            <span className="font-mono tabular-nums text-accent">
              {budgetDash != null ? (
                <>
                  {budgetDash.toFixed(0)} <DashIcon />
                </>
              ) : (
                "—"
              )}
            </span>
            {budgetDash != null && usdPrice != null && (
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                ≈ {formatCompactUsd(budgetDash * usdPrice)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-sm text-muted-foreground">
              Cycle progress
            </span>
            <span className="font-mono tabular-nums">
              {Math.round(sbProgress * 100)}%
            </span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {blocksLeft != null
                ? `${formatCompact(blocksLeft)} blocks left`
                : "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CountdownDial({
  label,
  subLabel,
  ms,
  progress,
  accent,
  icon,
  closed,
}: {
  label: string;
  subLabel: string;
  ms: number | null;
  progress: number;
  accent: string;
  icon: React.ReactNode;
  closed?: boolean;
}) {
  const parts = ms != null ? formatDurationParts(ms) : null;
  const value = closed ? "—" : (parts?.value ?? "—");
  const unit = closed ? "closed" : (parts?.unit ?? "");
  const safeProgress = Math.min(1, Math.max(0, progress));
  const circumference = 2 * Math.PI * 48;
  const dashOffset = circumference * (1 - safeProgress);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex aspect-square w-[160px] items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 112 112" aria-hidden>
          <title>{label}</title>
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="none"
            strokeWidth="7"
            className="stroke-border/40"
          />
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
            stroke={accent}
            style={{
              filter: `drop-shadow(0 0 8px color-mix(in oklab, ${accent} 60%, transparent))`,
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display-num text-3xl tabular-nums leading-none">
            {value}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <Badge
          variant="soft"
          className="font-mono"
          style={{ color: accent, borderColor: `${accent}33` }}
        >
          {icon}
          {label}
        </Badge>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {subLabel}
        </span>
      </div>
    </div>
  );
}

function TopHoldersCard({
  entries,
  total,
  usdPrice,
  isLoading,
}: {
  entries: ApiAddressBalanceEntry[];
  total: number | null;
  usdPrice: number | null;
  isLoading: boolean;
}) {
  const rows = entries.filter((e) => e.address !== "others");
  const othersRow = entries.find((e) => e.address === "others") ?? null;
  return (
    <Card className="lg:col-span-7">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Top Holders
          <Badge variant="soft-accent" className="font-mono">
            <Trophy className="size-3" />
            Rich list
          </Badge>
        </CardTitle>
        <CardDescription>
          {total != null
            ? `${formatCompact(total)} addresses · sorted by balance`
            : "Largest addresses by UTXO balance"}
        </CardDescription>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
            <Users className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ConcentrationBanner entries={entries} isLoading={isLoading} />
        <Table>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }, (_, i) => `rl-${i}`).map((k) => (
                <TableRow key={k} className="hover:bg-transparent">
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-2 w-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3}>
                  <EmptyState title="No data" />
                </TableCell>
              </TableRow>
            )}
            {rows.map((entry, idx) => (
              <TopHolderRow
                key={entry.address ?? `r-${idx}`}
                rank={idx + 1}
                entry={entry}
                usdPrice={usdPrice}
              />
            ))}
            {othersRow && <OthersRow entry={othersRow} />}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TopHolderRow({
  rank,
  entry,
  usdPrice,
}: {
  rank: number;
  entry: ApiAddressBalanceEntry;
  usdPrice: number | null;
}) {
  const address = entry.address ?? "";
  const balanceDuffs = entry.balance != null ? Number(entry.balance) : 0;
  const balanceDash = balanceDuffs / DUFFS_PER_DASH;
  const concentration =
    entry.concentration != null ? Number(entry.concentration) : 0;
  const usdValue = usdPrice != null ? balanceDash * usdPrice : null;
  return (
    <TableRow className="row-lift">
      <TableCell className="max-w-[200px]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/12 font-mono text-xs font-semibold text-accent">
            {rank}
          </span>
          <HashDisplay
            value={address}
            href="/address/$address"
            params={{ address }}
            copy={false}
            head={8}
            tail={6}
          />
        </div>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(100, concentration)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {concentration < 0.01
              ? `${concentration.toFixed(4)}%`
              : `${concentration.toFixed(2)}%`}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-sm font-medium tabular-nums text-accent">
            {formatCompact(balanceDash)} <DashIcon />
          </span>
          <span className="text-xs text-muted-foreground">
            {usdValue != null ? `≈ ${formatCompactUsd(usdValue)}` : "—"}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}

function OthersRow({ entry }: { entry: ApiAddressBalanceEntry }) {
  const balanceDash =
    entry.balance != null ? Number(entry.balance) / DUFFS_PER_DASH : 0;
  const concentration =
    entry.concentration != null ? Number(entry.concentration) : 0;
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="max-w-[200px]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/50 font-mono text-xs font-semibold text-muted-foreground">
            ∑
          </span>
          <span className="truncate font-mono text-sm font-medium text-muted-foreground">
            Other addresses
          </span>
        </div>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-muted-foreground/40 transition-all"
              style={{ width: `${Math.min(100, concentration)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {concentration.toFixed(2)}%
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <span className="font-mono text-sm font-medium tabular-nums text-muted-foreground">
          {formatCompact(balanceDash)} <DashIcon />
        </span>
      </TableCell>
    </TableRow>
  );
}
