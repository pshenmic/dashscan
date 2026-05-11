import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Avatar } from "dash-ui-kit/react";
import { ArrowLeftRight, MoveDown, MoveUp, Wallet } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { AreaChart } from "@/components/area-chart";
import { CopyButton } from "@/components/copy-button";
import { DataTable } from "@/components/data-table";
import { HashCell } from "@/components/hash-cell";
import { MiniStatCard } from "@/components/mini-stat-card";
import { PageStatus } from "@/components/page-status";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addressBalanceChartQueryOptions,
  addressQueryOptions,
  addressTransactionsQueryOptions,
} from "@/lib/api/addresses";
import type { ApiTransaction } from "@/lib/api/types";
import {
  formatDash,
  formatRelativeTime,
  getTxTypeBadgeStyle,
  getTxTypeLabel,
  sumVOut,
} from "@/lib/format";
import {
  getPageCount,
  PAGE_SIZE_OPTIONS,
  paginationSearchSchema,
} from "@/lib/pagination";
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

export const Route = createFileRoute("/address/$address")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: AddressDetailsPage,
  head: ({ params }) => ({
    meta: [
      {
        title: `Address ${params.address.slice(0, 12)}... | DashScan`,
      },
    ],
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

const txColumns: ColumnDef<ApiTransaction>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ getValue }) => {
      const ts = getValue<string | null>();
      return (
        <span className="text-muted-foreground">
          {ts ? formatRelativeTime(ts) : "Pending"}
        </span>
      );
    },
  },
  {
    accessorKey: "hash",
    header: "Hash",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Link
          to="/transactions/$hash"
          params={{ hash: row.original.hash }}
          onClick={(e) => e.stopPropagation()}
        >
          <HashCell hash={row.original.hash} />
        </Link>
        <CopyButton value={row.original.hash} />
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          "h-6 rounded-full px-2 text-[11px] font-medium",
          getTxTypeBadgeStyle(row.original.type),
        )}
      >
        {getTxTypeLabel(row.original.type)}
      </Badge>
    ),
  },
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ getValue }) => {
      const size = getValue<number | null | undefined>();
      return (
        <span className="text-muted-foreground">
          {size != null ? `${Math.max(1, Math.round(size / 1024))} Kb` : "—"}
        </span>
      );
    },
  },
  {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const tx = row.original;
      const duffs = tx.amount ?? sumVOut(tx.vOut);
      return <span className="font-mono font-medium">{formatDash(duffs)}</span>;
    },
  },
  {
    accessorKey: "confirmations",
    header: "Confirmations",
    cell: ({ getValue }) => {
      const c = getValue<number | null>();
      return (
        <span className="text-muted-foreground">
          {c != null ? c.toLocaleString() : "—"}
        </span>
      );
    },
  },
];

const txSkeletonWidths = ["w-20", "w-44", "w-24", "w-14", "w-20", "w-16"];

function AddressDetailsPage() {
  const { address } = Route.useParams();
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const tableNavigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");
  const [range, setRange] = useState<ChartRange>("1m");

  const {
    data: detail,
    isFetching: isDetailFetching,
    error: detailError,
  } = useQuery(addressQueryOptions({ network, address }));

  const rangeBounds = useMemo(() => getRangeBounds(range), [range]);
  const { data: chartData } = useQuery(
    addressBalanceChartQueryOptions({
      network,
      address,
      ...rangeBounds,
    }),
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
  const txPageCount = getPageCount(txData?.pagination);

  const filteredTxs = useMemo(
    () =>
      transactions.filter((tx) =>
        tx.hash.toLowerCase().includes(globalFilter.toLowerCase()),
      ),
    [transactions, globalFilter],
  );

  const table = useReactTable({
    data: filteredTxs,
    columns: txColumns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount: txPageCount,
  });

  const balanceDash = useMemo(() => {
    if (!detail) return null;
    return Number(detail.balance) / 1e8;
  }, [detail]);

  const chartPoints = useMemo(() => {
    if (!chartData) return [];
    return chartData.map((p) => ({
      key: p.timestamp,
      timestamp: p.timestamp,
      value: Number(p.data.balance) / 1e8,
    }));
  }, [chartData]);

  if (detailError) {
    return <PageStatus message="Address not found." />;
  }

  if (isDetailFetching && !detail) {
    return <PageStatus message="Loading address..." />;
  }

  if (!detail) {
    return <PageStatus message="Address not found." />;
  }

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-4 animate-fade-in-up">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-accent/12">
          <Avatar username={detail.address} className="size-8" />
        </div>
        <h1 className="flex min-w-0 flex-1 flex-wrap items-baseline gap-3 text-[34px] tracking-tight">
          <span className="text-muted-foreground">Address</span>
          <span className="break-all font-mono">{detail.address}</span>
        </h1>
        <CopyButton value={detail.address} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2 rounded-[24px] shadow-card [&>*]:min-w-0 animate-fade-in-up">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 grid-cols-2 [&>*]:min-w-0">
            <MiniStatCard
              icon={<Wallet className="size-5" strokeWidth={1.75} />}
              label="Total Balance"
              bgImage="/images/blocks/total.png"
              value={
                <>
                  <span>
                    {(Number(detail.balance) / 1e8).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}
                  </span>
                  <img src="/icons/dash.svg" alt="DASH" className="size-4" />
                </>
              }
            />

            <MiniStatCard
              icon={<MoveDown className="size-5" strokeWidth={2} />}
              label="Received"
              bgImage="/images/blocks/latest.png"
              value={
                <>
                  <span>
                    {(Number(detail.received) / 1e8).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}
                  </span>
                  <img src="/icons/dash.svg" alt="DASH" className="size-4" />
                </>
              }
            />

            <MiniStatCard
              icon={<MoveUp className="size-5" strokeWidth={2} />}
              label="Sent"
              bgImage="/images/blocks/reward.png"
              value={
                <>
                  <span>
                    {(Number(detail.sent) / 1e8).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}
                  </span>
                  <img src="/icons/dash.svg" alt="DASH" className="size-4" />
                </>
              }
            />

            <MiniStatCard
              icon={<ArrowLeftRight className="size-5" strokeWidth={1.75} />}
              label="Transactions"
              bgImage="/images/blocks/superblock.png"
              value={Number(detail.txCount).toLocaleString()}
            />
          </div>

          <Card className="flex flex-1 flex-col justify-center border-0 px-6 py-4 shadow-none">
            <div className="flex flex-col">
              <DetailRow label="First Seen">
                <span className="text-muted-foreground">—</span>
              </DetailRow>
              <DetailRow label="Last Seen">
                <span className="text-muted-foreground">—</span>
              </DetailRow>
              <DetailRow label="Total Fee Spent">
                <span className="text-muted-foreground">—</span>
              </DetailRow>
            </div>
          </Card>
        </div>

        <Card className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[24px] border-0 bg-white shadow-none">
          <CardHeader className="relative px-5 pb-2 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-accent/20 text-accent">
                <img src="/icons/dash.svg" alt="" className="size-5" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-muted-foreground">
                  Balance
                </p>
                <CardTitle className="mt-1 flex flex-wrap items-baseline gap-2 text-[34px] font-medium tracking-[-0.03em]">
                  <span className="font-extrabold text-[#21314d]">
                    {balanceDash != null
                      ? balanceDash.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })
                      : "—"}
                  </span>
                  <span className="text-muted-foreground">DASH</span>
                </CardTitle>
              </div>
            </div>
            <CardAction>
              <div className="flex items-center gap-1 rounded-full bg-[#EAF0FF] p-1">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRange(opt.value)}
                    className={cn(
                      "h-6 rounded-full px-2.5 text-[11px] font-semibold transition-colors",
                      range === opt.value
                        ? "bg-accent text-white"
                        : "text-accent hover:bg-white/60",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="relative flex flex-1 items-end px-3 pb-3 sm:px-4 sm:pb-4">
            {chartPoints.length > 0 ? (
              <AreaChart
                className="rounded-[20px]"
                data={chartPoints}
                getKey={(p) => p.key}
                getValue={(p) => p.value}
                getXLabel={(p) => {
                  const date = new Date(p.timestamp);
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
                renderTooltip={(p) => (
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {p.value.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}{" "}
                      DASH
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(p.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
                ariaLabel="Address balance over time"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No balance data for this range.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card
        className="border-0 shadow-none animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transactions
          </CardTitle>
          <CardAction>
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder="Search by Tx Hash..."
            />
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto px-3">
          <DataTable
            table={table}
            isFetching={isTxFetching}
            isEmpty={transactions.length === 0}
            skeletonWidths={txSkeletonWidths}
            skeletonRows={limit}
            emptyMessage="No transactions found."
            borderless
            onRowClick={(tx) =>
              tableNavigate({
                to: "/transactions/$hash",
                params: { hash: tx.hash },
              })
            }
          />
        </CardContent>
        <Pagination
          page={page}
          pageCount={txPageCount}
          onPageChange={(p) => navigate({ search: { page: p, limit } })}
          pageSize={limit}
          onPageSizeChange={(size) => {
            const next = (PAGE_SIZE_OPTIONS as readonly number[]).includes(size)
              ? (size as (typeof PAGE_SIZE_OPTIONS)[number])
              : 10;
            navigate({ search: { page: 1, limit: next } });
          }}
        />
      </Card>
    </main>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-6 py-3">
      <span className="min-w-24 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center text-xs">{children}</div>
    </div>
  );
}
