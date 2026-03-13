import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Box,
  Calendar,
  HardDrive,
  Hourglass,
  MoveDown,
  MoveUp,
  Square,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BlockTransactionsChart } from "@/components/block-transactions-chart";
import { CopyButton } from "@/components/copy-button";
import { DataTable } from "@/components/data-table";
import { HashCell } from "@/components/hash-cell";
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
import { blocksQueryOptions } from "@/lib/api/blocks";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type { ApiBlock } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/format";
import { getPageCount, paginationSearchSchema } from "@/lib/pagination";
import { appStore } from "@/lib/store";

export const Route = createFileRoute("/blocks/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: BlocksPage,
  head: () => ({
    meta: [{ title: "Blocks | DashScan" }],
  }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = "mainnet" as const;
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
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {formatRelativeTime(getValue<string>())}
      </span>
    ),
  },
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
    id: "fees",
    header: "Fees",
    cell: () => <span className="text-muted-foreground">—</span>,
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
    accessorKey: "txCount",
    header: "TX count",
    cell: ({ getValue }) => (
      <Badge className="h-6 border border-[#0C1C331F] bg-[#4C7EFF1F] font-medium text-foreground">
        {getValue<number>()}
      </Badge>
    ),
  },
];

function StatIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden size-12 items-center justify-center rounded-full border border-accent/12 text-accent sm:flex">
      {children}
    </div>
  );
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

const skeletonWidths = [
  "w-16",
  "w-20",
  "w-44",
  "w-28",
  "w-14",
  "w-16",
  "w-20",
  "w-16",
];

function BlocksPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState("");

  const prevNetworkRef = useRef(network);
  useEffect(() => {
    if (prevNetworkRef.current !== network) {
      prevNetworkRef.current = network;
      queryClient.removeQueries({ queryKey: ["blocks"] });
      navigate({ search: { page: 1, limit } });
    }
  }, [network, queryClient, navigate, limit]);

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

    let avgBlockSize: number | null = null;
    if (blocks.length > 0) {
      avgBlockSize = Math.round(
        blocks.reduce((s, b) => s + b.size, 0) / blocks.length / 1024,
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
      avgBlockSize,
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
      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_2fr] [&>*]:min-w-0 animate-fade-in-up">
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <Card className="p-4">
            <div className="flex h-full items-center gap-4 min-w-0">
              <StatIcon>
                <Box className="size-5" />
              </StatIcon>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Latest Block
                </p>
                <p className="truncate text-2xl font-extrabold">
                  {stats.latestHeight != null
                    ? `#${stats.latestHeight.toLocaleString()}`
                    : "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex h-full items-center gap-4">
              <StatIcon>
                <Box className="size-5" />
              </StatIcon>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Latest Superblock
                </p>
                <p className="text-2xl font-extrabold">#52151</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex h-full items-center gap-4">
              <StatIcon>
                <Hourglass className="size-5" />
              </StatIcon>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Block Time
                </p>
                <p className="text-2xl font-extrabold">
                  {stats.avgBlockTime != null
                    ? `${stats.avgBlockTime} Min`
                    : "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex h-full items-center gap-4">
              <StatIcon>
                <Box className="size-5" />
              </StatIcon>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Blocks
                </p>
                <p className="text-2xl font-extrabold">
                  {stats.totalBlocks != null
                    ? formatCompact(stats.totalBlocks)
                    : "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex h-full items-center gap-4">
              <StatIcon>
                <Square className="size-5" />
              </StatIcon>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Block Size
                </p>
                <p className="text-2xl font-extrabold">
                  {stats.avgBlockSize != null
                    ? `${stats.avgBlockSize} Kb`
                    : "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex h-full items-center gap-4">
              <StatIcon>
                <HardDrive className="size-5" />
              </StatIcon>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Blockchain Size
                </p>
                <p className="text-2xl font-extrabold">41.2 Gb</p>
              </div>
            </div>
          </Card>
        </div>

        <Card
          className="overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at top right, oklch(from var(--accent) l c h / 0.08), var(--color-card) 70%)",
          }}
        >
          <CardHeader>
            <div>
              <CardTitle>
                Block{" "}
                <span className="text-muted-foreground">Transactions</span>
              </CardTitle>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-base text-muted-foreground">
                  Total TXs:
                </span>
                <span className="text-[32px] font-extrabold leading-tight">
                  {stats.totalTxs != null ? formatCompact(stats.totalTxs) : "—"}
                </span>
                {stats.txChange != null && (
                  <Badge className="bg-accent/12 font-bold text-accent">
                    {stats.txChange >= 0 ? (
                      <MoveUp className="size-3" />
                    ) : (
                      <MoveDown className="size-3" />
                    )}
                    {Math.abs(stats.txChange).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
            <CardAction>
              <Badge
                variant="outline"
                className="gap-1.5 whitespace-nowrap rounded-full border-accent/20 px-3 py-1.5 text-sm"
              >
                <Calendar className="size-3.5 shrink-0" />
                Last 40 blocks
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <BlockTransactionsChart
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
