import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowLeftRight, Box, Gauge } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import type { ApiBlock } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/format";
import { getPageCount, paginationSearchSchema } from "@/lib/pagination";
import { appStore } from "@/lib/store";

export const Route = createFileRoute("/blocks/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page } }) => ({ page }),
  component: BlocksPage,
  head: () => ({
    meta: [{ title: "Blocks | DashScan" }],
  }),
  loader: ({ context, deps: { page } }) => {
    if (typeof window !== "undefined") return;
    return context.queryClient.prefetchQuery(
      blocksQueryOptions({
        network: "mainnet",
        page,
        limit: 10,
        order: "desc",
      }),
    );
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
    accessorKey: "txCount",
    header: "TX Count",
    cell: ({ getValue }) => (
      <Badge className="h-6 bg-accent/12 font-bold text-accent">
        {getValue<number>()} TXS
      </Badge>
    ),
  },
];

function StatIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-12 items-center justify-center rounded-full border border-accent/12 text-accent">
      {children}
    </div>
  );
}

const skeletonWidths = ["w-16", "w-20", "w-44", "w-28", "w-14", "w-16"];

function BlocksPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState("");

  const prevNetworkRef = useRef(network);
  useEffect(() => {
    if (prevNetworkRef.current !== network) {
      prevNetworkRef.current = network;
      queryClient.removeQueries({ queryKey: ["blocks"] });
      navigate({ search: { page: 1 } });
    }
  }, [network, queryClient, navigate]);

  const { data, isFetching } = useQuery(
    blocksQueryOptions({ network, page, limit: 10, order: "desc" }),
  );

  const blocks = data?.resultSet ?? [];
  const pageCount = getPageCount(data?.pagination);

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
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <div className="mb-6 grid gap-6 lg:grid-cols-[3fr_1fr_1fr] lg:grid-rows-2 animate-fade-in-up">
        <Card className="overflow-hidden p-0 lg:row-span-2">
          <div className="relative flex flex-1 flex-col sm:flex-row">
            <div className="absolute inset-y-0 left-0 w-full overflow-hidden sm:w-2/5">
              <img
                src="/images/blocks-bg.png"
                alt=""
                className="h-full w-full scale-140 object-cover object-center"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to right, oklch(from var(--accent) l c h / 0.2) 0%, var(--color-card) 100%)",
                }}
              />
            </div>
            <div className="h-48 sm:h-auto sm:w-2/5 sm:shrink-0" />
            <div className="relative flex flex-1 flex-col justify-center gap-4 p-6">
              <h2 className="text-[34px] font-extrabold">Blocks</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Blocks are the fundamental units of a blockchain, serving as{" "}
                <span className="font-semibold text-foreground">
                  containers that hold batches of transactions.
                </span>
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Each block is connected to the previous one, forming an
                immutable chain that ensures the{" "}
                <span className="font-semibold text-foreground">
                  security and integrity of the data
                </span>
                .
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Transactions Count",
                  "Block Height",
                  "Block Hash",
                  "Validator ID",
                ].map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-full border-border px-6 py-3 text-sm font-medium"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="gap-3 p-4">
          <p className="text-sm font-medium text-muted-foreground">Epoch</p>
          <p className="text-3xl font-extrabold">#32</p>
          <div className="h-1 rounded-full bg-accent/20">
            <div className="h-full w-[65%] rounded-full bg-accent" />
          </div>
          <p className="text-xs text-muted-foreground">
            Next Epoch: <span className="font-semibold">6d left</span>
          </p>
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
              <p className="text-3xl font-extrabold">
                {data?.pagination
                  ? data.pagination.total.toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex h-full items-center gap-4">
            <StatIcon>
              <Gauge className="size-5" />
            </StatIcon>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Avg. TPS
              </p>
              <p className="text-3xl font-extrabold">0.0363</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex h-full items-center gap-4">
            <StatIcon>
              <ArrowLeftRight className="size-5" />
            </StatIcon>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Transactions
              </p>
              <p className="text-3xl font-extrabold">59.2K</p>
            </div>
          </div>
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
        <CardContent className="px-3">
          <DataTable
            table={table}
            isFetching={isFetching}
            isEmpty={blocks.length === 0}
            skeletonWidths={skeletonWidths}
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
          onPageChange={(p) => navigate({ search: { page: p } })}
        />
      </Card>
    </main>
  );
}
