import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import {
  ArrowLeftRight,
  CalendarClock,
  Coins,
  History,
  MoveDown,
  MoveUp,
  Wallet,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
import { DashIcon } from "@/components/dash-icon";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addressBalanceChartQueryOptions,
  addressQueryOptions,
  addressTransactionsInfiniteQueryOptions,
  addressTransactionsQueryOptions,
  addressUtxosQueryOptions,
} from "@/lib/api/addresses";
import type { ApiTransaction, ApiUtxoEntry } from "@/lib/api/types";
import {
  addressNetAmount,
  DUFFS_PER_DASH,
  formatCompact,
  formatDuffs,
  formatRelativeTime,
} from "@/lib/format";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/themes/neo/components/copy-button";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import { EmptyState, NotFoundState } from "@/themes/neo/components/empty-state";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { ShareButton } from "@/themes/neo/components/share-button";
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

type ChartRange = "1d" | "1w" | "1m" | "1y";

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "1y", label: "1Y" },
];

const RANGE_MS: Record<ChartRange, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
};

function getRangeBounds(range: ChartRange) {
  const end = new Date();
  const start = new Date(end.getTime() - RANGE_MS[range]);
  return {
    timestampStart: start.toISOString(),
    timestampEnd: end.toISOString(),
  };
}

const chartConfig: ChartConfig = {
  balance: {
    label: "Balance",
    color: "var(--chart-1)",
  },
};

function ReceivedSentSparkline({
  points,
}: {
  points: { received: number; sent: number }[];
}) {
  const recvId = useId();
  const sentId = useId();
  if (points.length === 0) return null;
  return (
    <div className="h-12 w-full">
      <ChartContainer
        config={{
          received: { label: "Received", color: "var(--success)" },
          sent: { label: "Sent", color: "var(--destructive)" },
        }}
        className="aspect-auto h-12 w-full"
      >
        <AreaChart
          data={points}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <defs>
            <linearGradient id={recvId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-received)"
                stopOpacity={0.4}
              />
              <stop
                offset="100%"
                stopColor="var(--color-received)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id={sentId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-sent)"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="var(--color-sent)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <Area
            dataKey="received"
            type="monotone"
            stroke="var(--color-received)"
            fill={`url(#${recvId})`}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            dataKey="sent"
            type="monotone"
            stroke="var(--color-sent)"
            fill={`url(#${sentId})`}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line dataKey="balance" hide />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

interface RedesignAddressDetailPageProps {
  address: string;
}

export default function RedesignAddressDetailPage({
  address,
}: RedesignAddressDetailPageProps) {
  const network = useStore(appStore, (state) => state.network);
  const navigate = useNavigate({ from: "/address/$address" });
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<ChartRange>("1m");
  const [viewMode, setViewMode] = useTableViewMode("address-transactions");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE);
  const balanceGradientId = useId();

  const isInfinite = viewMode === "infinite";

  const {
    data: detail,
    isFetching: isDetailFetching,
    error: detailError,
  } = useQuery(addressQueryOptions({ network, address }));

  const rangeBounds = useMemo(() => getRangeBounds(range), [range]);
  const { data: chartData } = useQuery(
    addressBalanceChartQueryOptions({ network, address, ...rangeBounds }),
  );

  const {
    data: infiniteData,
    isFetching: isInfiniteFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...addressTransactionsInfiniteQueryOptions({
      network,
      address,
      limit: INFINITE_PAGE_SIZE,
      order: "desc",
    }),
    enabled: isInfinite,
  });

  const { data: pagedData, isFetching: isPagedFetching } = useQuery({
    ...addressTransactionsQueryOptions({
      network,
      address,
      page,
      limit: pageSize,
      order: "desc",
    }),
    enabled: !isInfinite,
  });

  const infiniteTransactions = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.resultSet) ?? [],
    [infiniteData],
  );
  const transactions = isInfinite
    ? infiniteTransactions
    : (pagedData?.resultSet ?? []);
  const total = isInfinite
    ? (infiniteData?.pages[0]?.pagination?.total ?? 0)
    : (pagedData?.pagination?.total ?? 0);

  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) => t.hash.toLowerCase().includes(q));
  }, [transactions, search]);

  const balanceDash = detail ? Number(detail.balance) / 1e8 : null;
  const receivedDash = detail ? Number(detail.received) / 1e8 : null;
  const sentDash = detail ? Number(detail.sent) / 1e8 : null;

  const flowSparkPoints = useMemo(() => {
    if (transactions.length === 0) return [];
    const ordered = [...transactions]
      .filter((t) => Boolean(t.timestamp))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    let cumIn = 0;
    let cumOut = 0;
    return ordered.map((t) => {
      const net = addressNetAmount(t, address);
      const value = Math.abs(net) / DUFFS_PER_DASH;
      if (net > 0) cumIn += value;
      else if (net < 0) cumOut += value;
      return {
        ts: new Date(t.timestamp).getTime(),
        received: cumIn,
        sent: cumOut,
      };
    });
  }, [transactions, address]);

  const chartPoints = useMemo(() => {
    if (!chartData) return [];
    return chartData.map((p) => ({
      timestamp: new Date(p.timestamp).getTime(),
      timestampLabel: p.timestamp,
      balance: Number(p.data.balance) / 1e8,
    }));
  }, [chartData]);

  if (detailError && !detail) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <NotFoundState
          kind="address"
          query={address}
          title="Address has no on-chain history yet"
          description="We couldn't find activity for this address on the current network. It may be brand new, on the wrong network, or never used."
        />
      </div>
    );
  }

  if (isDetailFetching && !detail) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (!detail) return null;

  const direction = (tx: ApiTransaction): "in" | "out" | "self" => {
    const inAddr = tx.vIn?.some((v) => v.address === address) ?? false;
    const outAddr = tx.vOut?.some((v) => v.address === address) ?? false;
    if (inAddr && outAddr) return "self";
    if (inAddr) return "out";
    return "in";
  };

  const txColumns: DataTableColumn<ApiTransaction>[] = [
    {
      id: "hash",
      header: "Transaction",
      cell: (row) => {
        const dir = direction(row);
        const dirIcon =
          dir === "in" ? (
            <MoveDown className="size-4" />
          ) : dir === "out" ? (
            <MoveUp className="size-4" />
          ) : (
            <ArrowLeftRight className="size-4" />
          );
        const dirClass =
          dir === "in"
            ? "bg-success/12 [&_svg]:text-success"
            : dir === "out"
              ? "bg-destructive/12 [&_svg]:text-destructive"
              : "bg-accent/12 [&_svg]:text-accent";
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                dirClass,
              )}
            >
              {dirIcon}
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
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "direction",
      header: "Direction",
      cell: (row) => {
        const dir = direction(row);
        if (dir === "in")
          return (
            <Badge variant="soft-success">
              <MoveDown className="size-3" /> Received
            </Badge>
          );
        if (dir === "out")
          return (
            <Badge variant="soft-destructive">
              <MoveUp className="size-3" /> Sent
            </Badge>
          );
        return (
          <Badge variant="soft">
            <ArrowLeftRight className="size-3" /> Self
          </Badge>
        );
      },
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => {
        const dir = direction(row);
        const duffs = Math.abs(addressNetAmount(row, address));
        const dash = duffs / DUFFS_PER_DASH;
        const formatted = dash >= 1 ? dash.toFixed(2) : dash.toFixed(4);
        const tone =
          dir === "in"
            ? "text-success"
            : dir === "out"
              ? "text-destructive"
              : "text-accent";
        const sign = dir === "in" ? "+" : dir === "out" ? "−" : "";
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={cn("font-mono text-sm font-medium tabular-nums", tone)}
            >
              {sign}
              {formatted} <DashIcon />
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {row.timestamp ? formatRelativeTime(row.timestamp) : "Pending"}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Address</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <Card variant="floating" className="hero-surface overflow-hidden">
          <CardContent className="flex flex-col gap-6 py-2 lg:flex-row lg:items-stretch lg:gap-10">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar username={detail.address} className="size-12" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Address
                  </span>
                  <span className="truncate font-mono text-sm sm:text-base">
                    {detail.address}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Balance
                </span>
                <span className="font-display text-4xl tabular-nums sm:text-5xl">
                  {balanceDash != null
                    ? balanceDash.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })
                    : "—"}{" "}
                  <DashIcon className="inline" />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton value={detail.address} label="Address" size="md" />
                <ShareButton
                  title={`Address ${detail.address.slice(0, 10)}…`}
                  fallbackUrl={detail.address}
                />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 lg:max-w-md">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-success">
                    <MoveDown className="size-3" /> Received
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {receivedDash != null
                      ? receivedDash.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : "—"}{" "}
                    <DashIcon className="inline" />
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-destructive">
                    <MoveUp className="size-3" /> Sent
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {sentDash != null
                      ? sentDash.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : "—"}{" "}
                    <DashIcon className="inline" />
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <ArrowLeftRight className="size-3" /> Tx
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {Number(detail.txCount).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SeenTile
                  icon={<CalendarClock className="size-3" />}
                  label="First Seen"
                  timestamp={detail.firstSeenBlockTimestamp}
                  blockHash={detail.firstSeenBlock}
                />
                <SeenTile
                  icon={<History className="size-3" />}
                  label="Last Seen"
                  timestamp={detail.lastSeenBlockTimestamp}
                  blockHash={detail.lastSeenBlock}
                />
              </div>
              <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Received vs Sent</span>
                  <span>last {flowSparkPoints.length} txs</span>
                </div>
                {flowSparkPoints.length > 0 ? (
                  <ReceivedSentSparkline points={flowSparkPoints} />
                ) : (
                  <div className="flex h-12 items-center justify-center text-xs text-muted-foreground">
                    No transactions loaded yet
                  </div>
                )}
              </div>
            </div>
            <div className="hidden h-32 w-32 shrink-0 items-center justify-center self-center rounded-2xl bg-accent/8 lg:flex">
              <Wallet className="size-12 text-accent/70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Balance over time</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-accent">
              {balanceDash != null ? (
                <>
                  {balanceDash.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{" "}
                  <DashIcon />
                </>
              ) : (
                "—"
              )}
            </CardTitle>
            <CardAction>
              <Tabs
                value={range}
                onValueChange={(v) => setRange(v as ChartRange)}
              >
                <TabsList>
                  {RANGE_OPTIONS.map((opt) => (
                    <TabsTrigger key={opt.value} value={opt.value}>
                      {opt.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardAction>
          </CardHeader>
          <CardContent>
            {chartPoints.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className={cn("aspect-auto h-[280px] w-full")}
              >
                <AreaChart data={chartPoints}>
                  <defs>
                    <linearGradient
                      id={balanceGradientId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-balance)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-balance)"
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
                    tickFormatter={(v) => {
                      const date = new Date(v);
                      if (range === "1d") {
                        return date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      }
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={60}
                    tickFormatter={(v) => v.toLocaleString()}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.timestampLabel
                            ? new Date(
                                payload[0].payload.timestampLabel,
                              ).toLocaleString()
                            : ""
                        }
                      />
                    }
                  />
                  <Area
                    dataKey="balance"
                    type="monotone"
                    stroke="var(--color-balance)"
                    fill={`url(#${balanceGradientId})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyState
                title="No balance data for this range"
                className="h-[280px]"
              />
            )}
          </CardContent>
        </Card>

        <AddressUtxosCard network={network} address={detail.address} />

        {transactions.length === 0 &&
        !isInfiniteFetching &&
        !isPagedFetching ? (
          <AddressNoHistory address={detail.address} />
        ) : (
          <DataTable
            columns={txColumns}
            data={filtered}
            isLoading={
              (isInfinite ? isInfiniteFetching : isPagedFetching) &&
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
                ? "Filter loaded transactions by hash…"
                : "Filter visible page by hash…",
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
        )}
      </div>
    </div>
  );
}

function SeenTile({
  icon,
  label,
  timestamp,
  blockHash,
}: {
  icon: ReactNode;
  label: string;
  timestamp: string | null;
  blockHash: string | null;
}) {
  const parsed = timestamp ? new Date(timestamp) : null;
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm">
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </span>
      {date ? (
        <span
          className="font-mono text-xs font-semibold tabular-nums"
          title={date.toISOString()}
        >
          {date.toLocaleString()}
        </span>
      ) : (
        <span className="font-mono text-xs text-muted-foreground">—</span>
      )}
      {blockHash ? (
        <Link
          to="/blocks/$hashOrHeight"
          params={{ hashOrHeight: blockHash }}
          className="truncate font-mono text-[10px] text-muted-foreground transition-colors hover:text-accent"
          title={blockHash}
        >
          {blockHash.slice(0, 16)}…
        </Link>
      ) : null}
    </div>
  );
}

function AddressNoHistory({ address }: { address: string }) {
  const [similar, setSimilar] = useState<
    Array<{ label: string; sub?: string; to: string }>
  >([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("dashscan:recent-searches");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{
        category: string;
        label: string;
        sub?: string;
        to: string;
      }>;
      if (!Array.isArray(parsed)) return;
      const prefix = address.slice(0, 4).toLowerCase();
      const matches = parsed.filter((r) => {
        if (r.category !== "Address") return false;
        const candidate = (r.sub ?? r.label).toLowerCase();
        return (
          candidate.startsWith(prefix) && candidate !== address.toLowerCase()
        );
      });
      setSimilar(matches.slice(0, 4));
    } catch {
      // ignore
    }
  }, [address]);

  return (
    <Card variant="floating" className="hero-surface overflow-hidden">
      <CardContent className="relative flex flex-col items-center gap-6 py-10 lg:flex-row lg:items-stretch lg:gap-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 50% at 50% 30%, color-mix(in oklab, var(--accent-amber, var(--accent)) 12%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-3">
          <QrIllustration value={address} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Scan to send <DashIcon className="inline size-3" />
          </span>
        </div>
        <div className="relative flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">
              No on-chain activity yet
            </h2>
            <p className="text-sm text-muted-foreground">
              This address has a zero balance and no transactions. Share it,
              scan the QR to receive Dash, or jump to a similar address from
              your history.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={address} label="Address" size="md" />
            <ShareButton
              title={`Address ${address.slice(0, 10)}…`}
              fallbackUrl={address}
            />
            <Button asChild variant="ghost" size="sm">
              <Link to="/blocks" search={{ page: 1, limit: 10 }}>
                Browse blocks
              </Link>
            </Button>
          </div>
          {similar.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Similar prefix
              </span>
              <div className="flex flex-col gap-1.5">
                {similar.map((s) => (
                  <Link
                    key={s.to}
                    to={s.to}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-2 text-left transition hover:border-accent/50 hover:bg-accent/5"
                  >
                    <span className="truncate font-mono text-xs text-foreground">
                      {s.sub ?? s.label}
                    </span>
                    <ArrowLeftRight className="size-3 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QrIllustration({ value }: { value: string }) {
  const grid = useMemo(() => {
    const cells: boolean[] = [];
    let seed = 0;
    for (let i = 0; i < value.length; i++) {
      seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
    }
    for (let i = 0; i < 81; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      cells.push((seed & 1) === 1);
    }
    return cells;
  }, [value]);
  return (
    <div
      className="relative grid size-32 grid-cols-9 gap-[2px] rounded-xl border border-border/60 bg-card/80 p-2 shadow-sm"
      aria-hidden
    >
      {grid.map((on, i) => {
        const isFinder =
          (i < 27 && i % 9 < 3) ||
          (i < 27 && i % 9 > 5) ||
          (i >= 54 && i < 81 && i % 9 < 3);
        const filled = isFinder || on;
        return (
          <span
            key={`qr-${i}-${value.charCodeAt(i % value.length)}`}
            className={cn(
              "rounded-[1px]",
              filled ? "bg-foreground/85" : "bg-transparent",
            )}
          />
        );
      })}
      <span
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background:
            "radial-gradient(closest-side, transparent 65%, color-mix(in oklab, var(--accent-amber, var(--accent)) 14%, transparent) 100%)",
        }}
      />
    </div>
  );
}

const UTXO_PAGE_SIZE = 10;

function AddressUtxosCard({
  network,
  address,
}: {
  network: "mainnet" | "testnet";
  address: string;
}) {
  const [utxoPage, setUtxoPage] = useState(1);
  const { data, isFetching, error } = useQuery({
    ...addressUtxosQueryOptions({
      network,
      address,
      page: utxoPage,
      limit: UTXO_PAGE_SIZE,
      order: "desc",
    }),
  });

  if (error) return null;
  const utxos = data?.resultSet ?? [];
  const total = data?.pagination?.total ?? 0;
  if (!isFetching && utxos.length === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / UTXO_PAGE_SIZE));
  const sumDuffs = utxos.reduce((s, u) => s + Number(u.amount), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          UTXOs
          <Badge variant="soft" className="font-mono">
            {formatCompact(total)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Unspent outputs · top {Math.min(utxos.length, UTXO_PAGE_SIZE)} by
          amount
        </CardDescription>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
            <Coins className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          {isFetching && utxos.length === 0 ? (
            Array.from({ length: 5 }, (_, i) => `u-${i}`).map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))
          ) : utxos.length === 0 ? (
            <EmptyState title="No UTXOs" />
          ) : (
            <UtxosTable utxos={utxos} sumDuffs={sumDuffs} />
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
            <span className="text-muted-foreground">
              Page {utxoPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                disabled={utxoPage <= 1}
                onClick={() => setUtxoPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                disabled={utxoPage >= totalPages}
                onClick={() => setUtxoPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UtxosTable({
  utxos,
  sumDuffs,
}: {
  utxos: ApiUtxoEntry[];
  sumDuffs: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {utxos.map((u) => {
        const amountDuffs = Number(u.amount);
        const share = sumDuffs > 0 ? (amountDuffs / sumDuffs) * 100 : 0;
        return (
          <Link
            key={`${u.prevTxHash}-${u.vOutIndex}`}
            to="/transactions/$hash"
            params={{ hash: u.prevTxHash }}
            className="group flex items-center gap-3 rounded-md border border-border/40 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent/5 no-underline"
          >
            <Coins className="size-4 shrink-0 text-muted-foreground group-hover:text-accent" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="break-all font-mono text-xs text-accent">
                  {u.prevTxHash}
                </span>
                <Badge variant="soft" className="font-mono">
                  #{u.vOutIndex}
                </Badge>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-secondary/60">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-accent">
              {formatDuffs(amountDuffs)} <DashIcon />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
