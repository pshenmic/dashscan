import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import { ArrowLeftRight, MoveDown, MoveUp, Wallet } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CopyButton } from "@/components/copy-button";
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
  addressTransactionsQueryOptions,
} from "@/lib/api/addresses";
import type { ApiTransaction } from "@/lib/api/types";
import { formatDash, formatRelativeTime, sumVOut } from "@/lib/format";
import { paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";
import { cn } from "@/lib/utils";

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
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: AddressDetailsPage,
  head: ({ params }) => ({
    meta: [{ title: `Address ${params.address.slice(0, 12)}... | DashScan` }],
  }),
  loader: async ({ context, params: { address }, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    const range = getRangeBounds("1m");
    await Promise.allSettled([
      context.queryClient.prefetchQuery(
        addressQueryOptions({ network, address }),
      ),
      context.queryClient.prefetchQuery(
        addressTransactionsQueryOptions({
          network,
          address,
          page,
          limit,
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
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<ChartRange>("1m");
  const balanceGradientId = useId();

  const {
    data: detail,
    isFetching: isDetailFetching,
    error: detailError,
  } = useQuery(addressQueryOptions({ network, address }));

  const rangeBounds = useMemo(() => getRangeBounds(range), [range]);
  const { data: chartData } = useQuery(
    addressBalanceChartQueryOptions({ network, address, ...rangeBounds }),
  );

  const { data: txData, isFetching: isTxFetching } = useQuery(
    addressTransactionsQueryOptions({
      network,
      address,
      page,
      limit,
      order: "desc",
    }),
  );

  const transactions = txData?.resultSet ?? [];
  const total = txData?.pagination?.total ?? 0;

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
          {formatDash(row.amount ?? sumVOut(row.vOut))}
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
              <CardTitle className="text-2xl tabular-nums">
                {balanceDash != null
                  ? balanceDash.toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })
                  : "—"}{" "}
                <span className="text-muted-foreground text-base">DASH</span>
              </CardTitle>
              <CardAction>
                <Wallet className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Received</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {receivedDash != null
                  ? receivedDash.toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })
                  : "—"}{" "}
                <span className="text-muted-foreground text-base">DASH</span>
              </CardTitle>
              <CardAction>
                <MoveDown className="size-4 text-success" />
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Transactions</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {Number(detail.txCount).toLocaleString()}
              </CardTitle>
              <CardAction>
                <ArrowLeftRight className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>Balance over time</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {balanceDash != null
                ? `${balanceDash.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })} DASH`
                : "—"}
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
          isLoading={isTxFetching}
          rowKey={(row) => row.hash}
          onRowClick={(tx) =>
            navigate({ to: "/transactions/$hash", params: { hash: tx.hash } })
          }
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Filter visible page by hash…",
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
