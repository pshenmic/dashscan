import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useId, useMemo } from "react";
import {
  masternodeTransactionsInfiniteQueryOptions,
  masternodeTransactionsQueryOptions,
} from "@/lib/api/masternodes";
import type { ApiTransaction } from "@/lib/api/types";
import type { PageSize } from "@/lib/pagination";
import type { Network } from "@/lib/store";
import {
  type TableViewMode,
  useTableViewMode,
} from "@/lib/use-table-view-mode";
import {
  metricBytes,
  metricDuffs,
  metricNumber,
} from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";
import { DataTable } from "./data-table";
import { IdentifierLink } from "./identifier-link";
import { LoadMore } from "./load-more";
import { Pagination } from "./pagination";
import { TransactionTypeBadge } from "./transaction-type-badge";

const columns: ColumnDef<ApiTransaction>[] = [
  {
    accessorKey: "hash",
    header: "Transaction Hash",
    cell: ({ row }) => (
      <IdentifierLink kind="transaction" value={row.original.hash} />
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <TransactionTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ row }) => metricBytes(row.original.size),
  },
  {
    accessorKey: "amount",
    header: "Output total (DASH)",
    cell: ({ row }) => metricDuffs(row.original.amount),
  },
  {
    accessorKey: "confirmations",
    header: "Confirmations",
    cell: ({ row }) => metricNumber(row.original.confirmations, 0),
  },
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => <BlockAge timestamp={row.original.timestamp} />,
  },
];

export function MasternodeTransactions({
  network,
  hash,
  page,
  limit,
  view,
}: {
  network: Network;
  hash: string;
  page: number;
  limit: PageSize;
  view?: TableViewMode;
}) {
  const navigate = useNavigate({ from: "/masternodes/$hash" });
  const titleId = useId();
  const [storedMode, setMode] = useTableViewMode(
    "dash-masternode-transactions",
    "pagination",
  );
  const mode = view ?? (page > 1 ? "pagination" : storedMode);
  const isInfinite = mode === "infinite";
  const params = { network, hash, limit, order: "desc" as const };
  const paged = useQuery({
    ...masternodeTransactionsQueryOptions({ ...params, page }),
    enabled: !isInfinite,
    placeholderData: keepPreviousData,
  });
  const infinite = useInfiniteQuery({
    ...masternodeTransactionsInfiniteQueryOptions(params),
    enabled: isInfinite,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) =>
      previous ??
      (paged.data?.pagination.page === 1 &&
      paged.data.pagination.limit === limit
        ? { pages: [paged.data], pageParams: [1] }
        : undefined),
  });
  const query = isInfinite ? infinite : paged;
  const rows = useMemo(() => {
    const entries = isInfinite
      ? (infinite.data?.pages.flatMap((batch) => batch.resultSet) ?? [])
      : (paged.data?.resultSet ?? []);
    const seen = new Set<string>();
    return entries.filter((entry) => {
      if (seen.has(entry.hash)) return false;
      seen.add(entry.hash);
      return true;
    });
  }, [isInfinite, infinite.data, paged.data]);
  const total = isInfinite
    ? infinite.data?.pages[0]?.pagination.total
    : paged.data?.pagination.total;
  const pageCount = total != null && total >= 0 ? Math.ceil(total / limit) : 0;
  const table = useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.hash,
  });
  const changeMode = (next: TableViewMode) => {
    setMode(next);
    void navigate({
      search: { page: 1, limit, view: next },
      resetScroll: false,
    });
  };
  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-xl font-extrabold"
        >
          Related transactions
          {total != null && total >= 0 && (
            <span className="tabular-nums text-muted-foreground">
              {metricNumber(total, 0)}
            </span>
          )}
        </h2>
        <fieldset
          aria-label="Transaction loading mode"
          className="flex rounded-xl bg-secondary p-1"
        >
          {(["pagination", "infinite"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => changeMode(value)}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground aria-pressed:bg-card aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              {value === "pagination" ? "Pages" : "Scroll"}
            </button>
          ))}
        </fieldset>
      </div>
      {query.isError && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Could not load transactions.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </p>
      )}
      <div className="overflow-x-auto">
        <DataTable
          table={table}
          isFetching={query.isFetching}
          isEmpty={rows.length === 0}
          variant="plain"
          growColumn="hash"
          caption="Transactions involving the masternode's current owner, voting, collateral or payout addresses. Output total is the transaction's total, not the masternode reward."
          skeletonRows={limit}
          skeletonWidths={["w-52", "w-24", "w-16", "w-28", "w-16", "w-16"]}
          emptyMessage={
            query.isError
              ? "Transactions unavailable"
              : "No related transactions on this page."
          }
          className="min-w-[850px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_td]:tabular-nums"
        />
      </div>
      {isInfinite && infinite.hasNextPage && (
        <LoadMore
          loading={infinite.isFetching}
          failed={infinite.isFetchNextPageError}
          onLoad={() => {
            if (!infinite.isFetching && !infinite.isPlaceholderData)
              void infinite.fetchNextPage();
          }}
          errorMessage="Could not load more transactions."
        />
      )}
      {!isInfinite && pageCount > 0 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          pageSize={limit}
          align="end"
          onPageChange={(next) =>
            void navigate({
              search: { page: next, limit, view: mode },
              resetScroll: false,
            })
          }
          onPageSizeChange={(size) =>
            void navigate({
              search: { page: 1, limit: size, view: mode },
              resetScroll: false,
            })
          }
        />
      )}
    </section>
  );
}
