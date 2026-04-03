import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Box, Calendar, MoveDown, MoveUp } from "lucide-react";
import { useMemo, useState } from "react";
import { BlockTransactionsChart } from "@/components/block-transactions-chart";
import { CopyButton } from "@/components/copy-button";
import { DataTable } from "@/components/data-table";
import { HashCell } from "@/components/hash-cell";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { blocksQueryOptions } from "@/lib/api/blocks";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type { ApiBlock } from "@/lib/api/types";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { getPageCount, paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/blocks/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: BlocksPage,
  head: () => ({
    meta: [{ title: "Blocks | DashScan" }],
  }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page, limit, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 40, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({
          network,
          page: 1,
          limit: 1,
          order: "desc",
        }),
      ),
    ]);
  },
});

const columns: ColumnDef<ApiBlock>[] = [
  {
    accessorKey: "height",
    header: "Height",
    cell: ({ row }) => (
      <Link
        to="/blocks/$hashOrHeight"
        params={{ hashOrHeight: row.original.hash }}
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex size-7 items-center justify-center rounded-full border border-accent/12 text-accent">
          <Box className="size-3.5" />
        </div>
        <span className="font-mono font-medium">#{row.original.height}</span>
      </Link>
    ),
  },
  {
    accessorKey: "hash",
    header: "Block Hash",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Link
          to="/blocks/$hashOrHeight"
          params={{ hashOrHeight: row.original.hash }}
          onClick={(e) => e.stopPropagation()}
        >
          <HashCell hash={row.original.hash} />
        </Link>
        <CopyButton value={row.original.hash} />
      </div>
    ),
  },
  {
    id: "minedBy",
    header: "Mined by",
    cell: () => <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "txCount",
    header: "Txs",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue<number>()}</span>
    ),
  },
  {
    id: "fees",
    header: "Fees",
    cell: () => <span className="text-muted-foreground">0</span>,
  },
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {Math.round(getValue<number>() / 1024)} Kb
      </span>
    ),
  },
  {
    accessorKey: "difficulty",
    header: "Difficulty",
    cell: ({ row, table }) => {
      const difficulty = row.original.difficulty;
      const nextRow = table.getRowModel().rows[row.index + 1];
      const prevDifficulty = nextRow?.original.difficulty;
      const isUp = prevDifficulty == null || difficulty >= prevDifficulty;
      return (
        <Badge
          className={`h-6 font-medium ${isUp ? "bg-[#4C7EFF1F] text-accent" : "bg-muted text-muted-foreground"}`}
        >
          {difficulty.toFixed(4)}{" "}
          {isUp ? (
            <MoveUp className="inline size-3" />
          ) : (
            <MoveDown className="inline size-3" />
          )}
        </Badge>
      );
    },
  },
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {formatRelativeTime(getValue<string>())}
      </span>
    ),
  },
];

const skeletonWidths = [
  "w-20",
  "w-44",
  "w-28",
  "w-14",
  "w-14",
  "w-16",
  "w-20",
  "w-16",
];

function BlocksPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");

  const { data, isFetching } = useQuery(
    blocksQueryOptions({ network, page, limit, order: "desc" }),
  );

  const { data: chartBlocksData } = useQuery(
    blocksQueryOptions({ network, page: 1, limit: 40, order: "desc" }),
  );

  const { data: txData } = useQuery(
    transactionsQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
  );

  const blocks = data?.resultSet ?? [];
  const pageCount = getPageCount(data?.pagination);
  const chartBlocks = chartBlocksData?.resultSet ?? [];

  const stats = useMemo(() => {
    const latestHeight = blocks.length > 0 ? blocks[0].height : null;
    const totalBlocks = data?.pagination?.total ?? null;
    const totalTxs = txData?.pagination?.total ?? null;

    let avgBlockTime: number | null = null;
    if (blocks.length >= 2) {
      const times = blocks.map((b) => new Date(b.timestamp).getTime());
      const diffs: number[] = [];
      for (let i = 0; i < times.length - 1; i++) {
        diffs.push(Math.abs(times[i] - times[i + 1]));
      }
      avgBlockTime = Math.round(
        diffs.reduce((s, d) => s + d, 0) / diffs.length / 60000,
      );
    }

    let txChange: number | null = null;
    if (chartBlocks.length >= 2) {
      const sorted = [...chartBlocks].sort((a, b) => a.height - b.height);
      const half = Math.floor(sorted.length / 2);
      const firstHalfTxs = sorted
        .slice(0, half)
        .reduce((s, b) => s + b.txCount, 0);
      const secondHalfTxs = sorted
        .slice(half)
        .reduce((s, b) => s + b.txCount, 0);
      if (firstHalfTxs > 0) {
        txChange = ((secondHalfTxs - firstHalfTxs) / firstHalfTxs) * 100;
      }
    }

    return {
      latestHeight,
      totalBlocks,
      totalTxs,
      avgBlockTime,
      txChange,
    };
  }, [blocks, data?.pagination, txData?.pagination, chartBlocks]);

  const table = useReactTable({
    data: blocks,
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
    <main className="mx-auto max-w-[1440px] overflow-hidden px-6 py-10">
      <div className="mb-6 grid gap-6 lg:grid-cols-[2fr_3fr] [&>*]:min-w-0 animate-fade-in-up">
        <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
          <StatCard
            icon={
              <img src="/icons/chart-pie.svg" alt="" className="size-[34px]" />
            }
            label="Latest Block"
            value={
              stats.latestHeight != null
                ? stats.latestHeight.toLocaleString()
                : "—"
            }
          />

          <StatCard
            icon={
              <img src="/icons/superblock.svg" alt="" className="size-[34px]" />
            }
            label="Latest Superblock"
            value="—"
            adornment={
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#edf3ff] px-2.5 py-1 text-[12px] font-semibold text-accent">
                7,336
                <img src="/icons/dash.svg" alt="" className="size-3.5" />
              </span>
            }
          />

          <StatCard
            icon={
              <img src="/icons/sandglass.svg" alt="" className="size-[34px]" />
            }
            label="Block Time"
            value={
              stats.avgBlockTime != null ? `${stats.avgBlockTime} Min` : "—"
            }
          />

          <StatCard
            icon={<img src="/icons/block.svg" alt="" className="size-[34px]" />}
            label="Blocks"
            value={
              stats.totalBlocks != null ? formatCompact(stats.totalBlocks) : "—"
            }
          />

          <StatCard
            icon={
              <img
                src="/icons/block-reward.svg"
                alt=""
                className="size-[34px]"
              />
            }
            label="Block Reward"
            value="—"
          />

          <StatCard
            icon={<img src="/icons/fees.svg" alt="" className="size-[34px]" />}
            label="Block Fees"
            value="—"
          />
        </div>

        <Card className="relative overflow-hidden rounded-[24px] border bg-white">
          <div
            className="pointer-events-none absolute -inset-px bg-no-repeat"
            style={{
              backgroundImage: "url('/images/blocks/blocks-hero-bg.png')",
              backgroundPosition: "top right",
              backgroundSize: "cover",
            }}
          />
          <CardHeader className="relative px-5 pb-2 sm:px-6 ">
            <div>
              <CardTitle className="text-[34px] font-medium tracking-[-0.03em] text-muted-foreground">
                Block{" "}
                <span className="font-normal text-[#21314d]">Transactions</span>
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-medium text-[#9aa7bd]">Total TXs:</span>
                <span className="text-[24px] font-extrabold leading-none tracking-[-0.03em] text-[#1d2c47]">
                  {stats.totalTxs != null ? formatCompact(stats.totalTxs) : "—"}
                </span>
                {stats.txChange != null && (
                  <Badge className="h-5 rounded-full border-0 bg-accent/10 px-1.5 text-[10px] font-bold text-accent">
                    {stats.txChange >= 0 ? (
                      <MoveUp className="size-2.5" />
                    ) : (
                      <MoveDown className="size-2.5" />
                    )}
                    {Math.abs(stats.txChange).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
            <CardAction>
              <Badge
                variant="outline"
                className="h-7 gap-1.5 whitespace-nowrap rounded-full border-white/80 bg-white/8 px-2.5 text-[11px] font-medium text-white backdrop-blur-[2px]"
              >
                <Calendar className="size-3 shrink-0" />1 Month
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="relative px-3 pb-3 sm:px-4 sm:pb-4">
            <BlockTransactionsChart
              className="rounded-[20px]"
              data={chartBlocks.map((b) => ({
                height: b.height,
                txCount: b.txCount,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Blocks
          </CardTitle>
          <CardAction>
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder="Search by Block Hash..."
            />
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto px-3">
          <DataTable
            table={table}
            isFetching={isFetching}
            isEmpty={blocks.length === 0}
            skeletonWidths={skeletonWidths}
            skeletonRows={limit}
            emptyMessage="No blocks found."
            onRowClick={(block) =>
              navigate({
                to: "/blocks/$hashOrHeight",
                params: { hashOrHeight: block.hash },
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
