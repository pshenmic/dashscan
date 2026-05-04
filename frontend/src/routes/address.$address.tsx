import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import { ArrowLeftRight, MoveDown, MoveUp, Wallet } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CopyButton } from "@/components/copy-button";
import { DashIcon } from "@/components/dash-icon";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import { InstantLockBadge, TxTypeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addressBalanceChartQueryOptions,
  addressQueryOptions,
  addressTransactionsInfiniteQueryOptions,
  addressTransactionsQueryOptions,
} from "@/lib/api/addresses";
import type { ApiTransaction } from "@/lib/api/types";
import { DUFFS_PER_DASH, formatRelativeTime, sumVOut } from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { cn } from "@/lib/utils";

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

export const Route = createFileRoute("/address/$address")({
  component: AddressDetailsPage,
  head: ({ params }) => ({
    meta: [{ title: `Address ${params.address.slice(0, 12)}... | DashScan` }],
  }),
  loader: async ({ context, params: { address } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    const range = getRangeBounds("1m");
    await Promise.allSettled([
      context.queryClient.prefetchQuery(
        addressQueryOptions({ network, address }),
      ),
      context.queryClient.prefetchInfiniteQuery(
        addressTransactionsInfiniteQueryOptions({
          network,
          address,
          limit: INFINITE_PAGE_SIZE,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchQuery(
        addressBalanceChartQueryOptions({ network, address, ...range }),
      ),
    ]);
  },
});

function AddressDetailsPage() {
  const { address } = Route.useParams();
  const network = useStore(appStore, (state) => state.network);
  const navigate = Route.useNavigate();
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

  const chartPoints = useMemo(() => {
    if (!chartData) return [];
    return chartData.map((p) => ({
      timestamp: new Date(p.timestamp).getTime(),
      timestampLabel: p.timestamp,
      balance: Number(p.data.balance) / 1e8,
    }));
  }, [chartData]);

  if (detailError || (!isDetailFetching && !detail)) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="Address not found"
          description="No on-chain history exists for this address yet."
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
      id: "time",
      header: "Time",
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.timestamp ? formatRelativeTime(row.timestamp) : "Pending"}
        </span>
      ),
    },
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
      id: "type",
      header: "Type",
      cell: (row) => <TxTypeBadge type={row.type} />,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums">
          {(() => {
            const val = row.amount ?? sumVOut(row.vOut);
            const dash = val / DUFFS_PER_DASH;
            return dash >= 1 ? dash.toFixed(2) : dash.toFixed(4);
          })()} <DashIcon />
        </span>
      ),
    },
    {
      id: "instantlock",
      header: "InstantSend",
      cell: (row) => <InstantLockBadge locked={row.instantLock} />,
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2 min-w-0">
              <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                <Avatar username={detail.address} className="size-9" />
                <span>Address</span>
              </h1>
              <p className="font-mono text-xs sm:text-sm break-all text-muted-foreground">
                {detail.address}
              </p>
            </div>
            <CopyButton value={detail.address} label="Address" size="md" />
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Balance</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {balanceDash != null
                  ? balanceDash.toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })
                  : "—"}{" "}
                <DashIcon />
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Wallet className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Received</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {receivedDash != null
                  ? receivedDash.toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })
                  : "—"}{" "}
                <DashIcon />
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-success/12 [&_svg]:text-success">
                  <MoveDown className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Transactions</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {Number(detail.txCount).toLocaleString()}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <ArrowLeftRight className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
        </div>

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
      </div>
    </div>
  );
}
