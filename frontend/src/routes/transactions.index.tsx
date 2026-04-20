import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowLeftRight,
  BadgePercent,
  Box,
  Calendar,
  Check,
  Lock,
  MoveDown,
  MoveUp,
  Percent,
  Timer,
  Unlock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DataTable } from "@/components/data-table";
import { HashCell } from "@/components/hash-cell";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { TransactionsAmountChart } from "@/components/transactions-amount-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { transactionsStatsQueryOptions } from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import {
  formatCompact,
  formatDuffs,
  formatRelativeTime,
  getTxTypeBadgeStyle,
  getTxTypeLabel,
  sumVOut,
} from "@/lib/format";
import { getPageCount, paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/transactions/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: TransactionsPage,
  head: () => ({
    meta: [{ title: "Transactions | DashScan" }],
  }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({
          network,
          page,
          limit,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchQuery(
        transactionsStatsQueryOptions({ network, intervalsCount: 30 }),
      ),
    ]);
  },
});

const columns: ColumnDef<ApiTransaction>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatRelativeTime(getValue<string>())}
      </span>
    ),
  },
  {
    accessorKey: "hash",
    header: "TX Hash",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          to="/transactions/$hash"
          params={{ hash: row.original.hash }}
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex size-7 items-center justify-center rounded-full border border-accent/12 text-accent">
            <ArrowLeftRight className="size-3.5" />
          </div>
          <HashCell hash={row.original.hash} />
        </Link>
        <CopyButton value={row.original.hash} />
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ getValue }) => (
      <Badge
        className={`h-6 whitespace-nowrap border font-medium ${getTxTypeBadgeStyle(getValue<number>())}`}
      >
        {getTxTypeLabel(getValue<number>())}
      </Badge>
    ),
  },
  {
    accessorKey: "blockHeight",
    header: "Block",
    cell: ({ row }) => (
      <Link
        to="/blocks/$hashOrHeight"
        params={{ hashOrHeight: row.original.blockHash }}
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex size-7 items-center justify-center rounded-full border border-accent/12 text-accent">
          <Box className="size-3.5" />
        </div>
        <span className="font-mono font-medium">
          #{row.original.blockHeight}
        </span>
      </Link>
    ),
  },
  {
    id: "amount",
    header: () => <span className="text-right block">Amount</span>,
    cell: ({ row }) => (
      <div className="text-right">
        {formatDuffs(sumVOut(row.original.vOut))} DASH
      </div>
    ),
  },
  {
    accessorKey: "confirmations",
    header: () => <span className="text-right block">Confirmations</span>,
    cell: ({ getValue }) => (
      <div className="text-right">
        <span className="inline-flex size-8 items-center justify-center rounded-full border border-accent/20 font-medium text-accent">
          {getValue<number>() ?? "—"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "instantLock",
    header: "InstantSend",
    cell: ({ getValue }) => {
      const locked = getValue<boolean>();
      return locked ? (
        <Badge className="h-6 gap-1 border border-emerald-500 bg-emerald-500/12 font-medium text-emerald-500">
          <Lock className="size-3" />
          Locked
        </Badge>
      ) : (
        <Badge className="h-6 gap-1 border border-border bg-muted font-medium text-muted-foreground">
          <Unlock className="size-3" />
          Pending
        </Badge>
      );
    },
  },
];

const skeletonWidths = ["w-16", "w-44", "w-20", "w-20", "w-24", "w-12", "w-20"];

function TransactionsPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");

  const { data, isFetching } = useQuery(
    transactionsQueryOptions({ network, page, limit, order: "desc" }),
  );

  const { data: txStats } = useQuery(
    transactionsStatsQueryOptions({ network, intervalsCount: 30 }),
  );

  const transactions = data?.resultSet ?? [];
  const pageCount = getPageCount(data?.pagination);
  const total = data?.pagination?.total ?? null;

  const chartData = useMemo(() => {
    if (!txStats) return [];
    return txStats
      .map((e) => ({ timestamp: e.timestamp, count: e.data.count }))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }, [txStats]);

  const { change, tps } = useMemo(() => {
    if (chartData.length < 2) return { change: null, tps: null };

    const half = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, half).reduce((s, d) => s + d.count, 0);
    const secondHalf = chartData.slice(half).reduce((s, d) => s + d.count, 0);
    const firstTs = new Date(chartData[0].timestamp).getTime();
    const lastTs = new Date(
      chartData[chartData.length - 1].timestamp,
    ).getTime();
    const spanSeconds = (lastTs - firstTs) / 1000;

    return {
      change:
        firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : null,
      tps: spanSeconds > 0 ? (firstHalf + secondHalf) / spanSeconds : null,
    };
  }, [chartData]);

  const table = useReactTable({
    data: transactions,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount,
  });

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <div className="mb-6 grid gap-6 lg:grid-cols-2 rounded-[24px] shadow-card [&>*]:min-w-0 animate-fade-in-up">
        <Card className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[24px] border-0 bg-white shadow-none">
          <CardHeader className="relative px-5 pb-2 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-accent/20 text-accent">
                <ArrowLeftRight className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[15px] font-medium text-muted-foreground">
                  Transactions Amount (Total)
                </p>
                <CardTitle className="mt-1 flex flex-wrap items-center gap-2 text-[34px] font-medium tracking-[-0.03em]">
                  <span className="font-extrabold text-[#21314d]">
                    {total != null ? formatCompact(total) : "—"}
                  </span>
                  <span className="text-muted-foreground">TXs</span>
                  {change != null && (
                    <Badge className="h-5 rounded-full border-0 bg-accent/10 px-1.5 text-[10px] font-bold text-accent">
                      {change >= 0 ? (
                        <MoveUp className="size-2.5" />
                      ) : (
                        <MoveDown className="size-2.5" />
                      )}
                      {Math.abs(change).toFixed(1)}%
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </div>
            <CardAction>
              <Badge className="h-7 gap-1.5 whitespace-nowrap rounded-full border-0 bg-[#EAF0FF] px-2.5 text-[11px] font-medium text-accent">
                <Calendar className="size-3 shrink-0" />1 Month
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="relative flex flex-1 items-end px-3 pb-3 sm:px-4 sm:pb-4">
            <TransactionsAmountChart
              className="rounded-[20px]"
              data={chartData}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 grid-cols-2 grid-rows-2 auto-rows-fr [&>*]:min-w-0">
          <StatCard
            icon={<Timer className="size-5" strokeWidth={1.75} />}
            label="Average Blockchain TPS"
            value={
              <>
                {tps != null ? tps.toFixed(2) : "—"}{" "}
                <span className="text-muted-foreground font-medium">
                  Transactions
                </span>
              </>
            }
            bgImage="/images/blocks/time.png"
          />

          <StatCard
            icon={<Percent className="size-5" strokeWidth={1.75} />}
            label="Average Transaction Fees"
            value={
              <>
                —{" "}
                <span className="text-muted-foreground font-medium">Dash</span>
              </>
            }
            bgImage="/images/blocks/fees.png"
          />

          <StatCard
            icon={<BadgePercent className="size-5" strokeWidth={1.75} />}
            label="Total Transaction Fees"
            value={
              <>
                —{" "}
                <span className="text-muted-foreground font-medium">Dash</span>
              </>
            }
            bgImage="/images/blocks/total.png"
          />

          <StatCard
            icon={<Check className="size-5" strokeWidth={2} />}
            label="Average InstantLock confirmation"
            value={
              <>
                1-3{" "}
                <span className="text-muted-foreground font-medium">
                  Seconds
                </span>
              </>
            }
            bgImage="/images/blocks/latest.png"
          />
        </div>
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
              placeholder="Search by TX Hash..."
            />
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto px-3">
          <DataTable
            table={table}
            isFetching={isFetching}
            isEmpty={transactions.length === 0}
            skeletonWidths={skeletonWidths}
            skeletonRows={limit}
            emptyMessage="No transactions found."
            borderless
            onRowClick={(tx) =>
              navigate({
                to: "/transactions/$hash",
                params: { hash: tx.hash },
              })
            }
          />
        </CardContent>
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={(p) => navigate({ search: { page: p, limit } })}
          pageSize={limit}
          onPageSizeChange={(size) =>
            navigate({ search: { page: 1, limit: size } })
          }
        />
      </Card>
    </main>
  );
}
