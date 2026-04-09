import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowLeftRight, Box, Lock, Unlock } from "lucide-react";
import { useState } from "react";
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
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import {
  formatDuffs,
  formatRelativeTime,
  getTxTypeBadgeStyle,
  getTxTypeLabel,
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
    return context.queryClient.prefetchQuery(
      transactionsQueryOptions({
        network: defaultNetwork,
        page,
        limit,
        order: "desc",
      }),
    );
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
    accessorKey: "amount",
    header: () => <span className="text-right block">Amount</span>,
    cell: ({ getValue }) => (
      <div className="text-right">{formatDuffs(getValue<number>())} DASH</div>
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

  const transactions = data?.resultSet ?? [];
  const pageCount = getPageCount(data?.pagination);

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
      <h1 className="mb-6 text-4xl font-extrabold tracking-tight">
        Transactions
      </h1>

      <Card>
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
