import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowLeftRight, Box } from "lucide-react";
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
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import { getPageCount, paginationSearchSchema } from "@/lib/pagination";
import { appStore } from "@/lib/store";

export const Route = createFileRoute("/transactions/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page } }) => ({ page }),
  component: TransactionsPage,
  head: () => ({
    meta: [{ title: "Transactions | DashScan" }],
  }),
  loader: ({ context, deps: { page } }) => {
    if (typeof window !== "undefined") return;
    return context.queryClient.prefetchQuery(
      transactionsQueryOptions({
        network: "mainnet",
        page,
        limit: 10,
        order: "desc",
      }),
    );
  },
});

const columns: ColumnDef<ApiTransaction>[] = [
  {
    id: "age",
    header: "Age",
    cell: () => <span className="text-muted-foreground">—</span>,
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
    id: "from",
    header: "From",
    cell: () => <span className="text-muted-foreground">—</span>,
  },
  {
    id: "to",
    header: "To",
    cell: () => <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "amount",
    header: "Value",
    cell: ({ getValue }) => (
      <Badge className="h-6 bg-accent/12 font-bold text-accent">
        {getValue<number>()} DASH
      </Badge>
    ),
  },
];

const skeletonWidths = ["w-16", "w-44", "w-20", "w-28", "w-28", "w-20"];

function TransactionsPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState("");

  const prevNetworkRef = useRef(network);
  useEffect(() => {
    if (prevNetworkRef.current !== network) {
      prevNetworkRef.current = network;
      queryClient.removeQueries({ queryKey: ["transactions"] });
      navigate({ search: { page: 1 } });
    }
  }, [network, queryClient, navigate]);

  const { data, isFetching } = useQuery(
    transactionsQueryOptions({ network, page, limit: 10, order: "desc" }),
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
        <CardContent className="px-3">
          <DataTable
            table={table}
            isFetching={isFetching}
            isEmpty={transactions.length === 0}
            skeletonWidths={skeletonWidths}
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
          onPageChange={(p) => navigate({ search: { page: p } })}
        />
      </Card>
    </main>
  );
}
