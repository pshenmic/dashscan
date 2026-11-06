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
import { X } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import { searchQueryOptions } from "@/lib/api/search";
import {
  transactionsInfiniteQueryOptions,
  transactionsQueryOptions,
} from "@/lib/api/transactions";
import type { ApiBlock, ApiTransaction } from "@/lib/api/types";
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
import { ColumnSearch } from "./column-search";
import { DataTable } from "./data-table";
import { IdentifierLink } from "./identifier-link";
import { LoadMore } from "./load-more";
import { Pagination } from "./pagination";
import { TransactionTypeBadge } from "./transaction-type-badge";

const columns: ColumnDef<ApiTransaction>[] = [
  {
    accessorKey: "hash",
    header: ({ table }) => (
      <ColumnSearch
        kind="hash"
        label="Transaction Hash"
        activeValue={table.getState().globalFilter}
        onChange={table.setGlobalFilter}
      />
    ),
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
];

export function BlockTransactionsTable({
  block,
  network,
  page,
  limit,
}: {
  block: ApiBlock;
  network: Network;
  page: number;
  limit: PageSize;
}) {
  const navigate = useNavigate({ from: "/blocks/$hashOrHeight" });
  const inputId = useId();
  const [hash, setHash] = useState<string | undefined>();
  const searching = hash !== undefined;
  const [storedMode, setMode] = useTableViewMode(
    "dash-block-transactions",
    "pagination",
  );
  const mode = page > 1 ? "pagination" : storedMode;
  const isInfinite = mode === "infinite";
  const transactions = useQuery({
    ...transactionsQueryOptions({
      network,
      blockHeight: block.height,
      page,
      limit,
      order: "asc",
    }),
    enabled: !searching && !isInfinite,
    placeholderData: keepPreviousData,
  });
  const infinite = useInfiniteQuery({
    ...transactionsInfiniteQueryOptions({
      network,
      blockHeight: block.height,
      limit,
      order: "asc",
    }),
    enabled: !searching && isInfinite,
    staleTime: 30_000,
    placeholderData: (previous) =>
      previous ??
      (transactions.data?.pagination.page === 1
        ? { pages: [transactions.data], pageParams: [1] }
        : undefined),
  });
  const lookup = useQuery({
    ...searchQueryOptions({ network, query: hash ?? "" }),
    enabled: searching,
  });
  const found = lookup.data?.transaction;
  const loadedRows = useMemo(() => {
    if (searching) return found?.blockHash === block.hash ? [found] : [];
    if (!isInfinite) return transactions.data?.resultSet ?? [];
    const seen = new Set<string>();
    return (
      infinite.data?.pages.flatMap((batch) => batch.resultSet) ?? []
    ).filter((transaction) => {
      if (seen.has(transaction.hash)) return false;
      seen.add(transaction.hash);
      return true;
    });
  }, [
    searching,
    found,
    block.hash,
    isInfinite,
    transactions.data,
    infinite.data,
  ]);
  const rows = useMemo(
    () =>
      loadedRows
        .filter((transaction) => transaction.blockHash === block.hash)
        .map((transaction) => ({
          ...transaction,
          confirmations: block.confirmations,
        })),
    [loadedRows, block.hash, block.confirmations],
  );
  const hasMore = infinite.hasNextPage && rows.length < block.txCount;
  const activeQuery = searching ? lookup : isInfinite ? infinite : transactions;
  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter: hash },
    onGlobalFilterChange: setHash,
    manualFiltering: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.hash,
  });
  const pageCount = Math.max(1, Math.ceil(block.txCount / limit));
  const loadMore = useCallback(() => {
    if (hasMore && !infinite.isFetching && !infinite.isPlaceholderData)
      void infinite.fetchNextPage();
  }, [
    hasMore,
    infinite.isFetching,
    infinite.isPlaceholderData,
    infinite.fetchNextPage,
  ]);
  const changeMode = (nextMode: TableViewMode) => {
    setMode(nextMode);
    if (page !== 1)
      void navigate({ search: { page: 1, limit }, resetScroll: false });
  };

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2
          id={`${inputId}-heading`}
          className="flex items-center gap-2 text-xl font-extrabold"
        >
          Transactions{" "}
          <span className="text-muted-foreground">
            {metricNumber(block.txCount, 0)}
          </span>
          <output className="sr-only">
            {activeQuery.isFetching ? "Updating transactions…" : ""}
          </output>
        </h2>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {hash && (
            <button
              type="button"
              aria-label="Clear transaction hash filter"
              title={hash}
              onClick={() => setHash(undefined)}
              className="inline-flex max-w-full items-center gap-2 rounded-lg bg-action-subtle px-3 py-1 text-xs text-accent focus-visible:outline-2 focus-visible:outline-ring sm:max-w-64"
            >
              <span className="truncate">Transaction Hash: {hash}</span>
              <X className="size-3 shrink-0" aria-hidden="true" />
            </button>
          )}
          <fieldset
            aria-label="Loading mode"
            className="inline-flex shrink-0 rounded-xl bg-secondary p-1"
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
      </div>
      {activeQuery.isError &&
      !(isInfinite && !searching && infinite.isFetchNextPageError) ? (
        <div role="alert" className="py-10 text-center text-sm">
          <p>Could not load transactions.</p>
          <button
            type="button"
            onClick={() => void activeQuery.refetch()}
            className="mt-2 text-accent underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <DataTable
            table={table}
            isFetching={activeQuery.isFetching}
            isEmpty={rows.length === 0}
            variant="plain"
            growColumn="hash"
            caption={`Transactions in block ${block.height}`}
            skeletonRows={searching ? 1 : Math.min(limit, block.txCount)}
            skeletonWidths={["w-52", "w-24", "w-16", "w-28", "w-16"]}
            emptyMessage={
              searching
                ? "No matching transaction in this block."
                : "No transactions on this page."
            }
            className="min-w-[800px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5 [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_[data-column]:not([data-column=hash]):not([data-column=type])]:text-right [&_td]:tabular-nums"
          />
        </div>
      )}
      {!searching && isInfinite && hasMore && (
        <LoadMore
          loading={infinite.isFetching}
          failed={infinite.isFetchNextPageError}
          onLoad={loadMore}
          errorMessage="Could not load more transactions."
        />
      )}
      {!searching && !isInfinite && (
        <Pagination
          page={page}
          pageCount={pageCount}
          pageSize={limit}
          align="end"
          onPageChange={(nextPage) =>
            void navigate({
              search: { page: nextPage, limit },
              resetScroll: false,
            })
          }
          onPageSizeChange={(nextLimit) =>
            void navigate({
              search: { page: 1, limit: nextLimit },
              resetScroll: false,
            })
          }
        />
      )}
    </section>
  );
}
