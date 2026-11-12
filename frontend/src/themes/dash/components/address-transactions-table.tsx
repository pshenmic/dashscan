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
import { RelativeTime } from "@/components/relative-time";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  addressTransactionsInfiniteQueryOptions,
  addressTransactionsQueryOptions,
} from "@/lib/api/addresses";
import { searchQueryOptions } from "@/lib/api/search";
import { transactionQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
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

function belongsToAddress(transaction: ApiTransaction, address: string) {
  return (
    transaction.vIn?.some((input) => input.address === address) ||
    transaction.vOut?.some((output) => output.address === address)
  );
}

function netChange(transaction: ApiTransaction, address: string) {
  if (!transaction.vIn || !transaction.vOut) return null;
  const inputs = transaction.vIn.filter((input) => input.address === address);
  const outputs = transaction.vOut.filter(
    (output) => output.address === address,
  );
  const values = [
    ...inputs.map((input) =>
      input.amount == null ? NaN : -Number(input.amount),
    ),
    ...outputs.map((output) =>
      output.value == null ? NaN : Number(output.value),
    ),
  ];
  if (!values.length || values.some((value) => !Number.isSafeInteger(value)))
    return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number.isSafeInteger(total) ? total : null;
}

function transactionColumns(address: string): ColumnDef<ApiTransaction>[] {
  return [
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
      id: "amount",
      header: "Net change (DASH)",
      cell: ({ row }) => {
        const value = netChange(row.original, address);
        if (value == null) return "—";
        return (
          <span
            className={`tabular-nums ${value > 0 ? "text-success" : value < 0 ? "text-destructive" : ""}`}
          >
            {value > 0 ? "+" : value < 0 ? "−" : ""}
            {metricDuffs(Math.abs(value))}
          </span>
        );
      },
    },
    {
      accessorKey: "confirmations",
      header: "Confirmations",
      cell: ({ row }) => metricNumber(row.original.confirmations, 0),
    },
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        const timestamp = row.original.timestamp;
        if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return "—";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={formatDateTime(new Date(timestamp))}
                className="inline-block min-w-24 whitespace-nowrap text-right text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <time dateTime={timestamp}>
                  <RelativeTime timestamp={timestamp} />
                </time>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {formatDateTime(new Date(timestamp))}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
  ];
}

export function AddressTransactionsTable({
  address,
  network,
  page,
  limit,
  total,
}: {
  address: string;
  network: Network;
  page: number;
  limit: PageSize;
  total: number;
}) {
  const navigate = useNavigate({ from: "/address/$address" });
  const headingId = useId();
  const [hash, setHash] = useState<string | undefined>();
  const searching = hash !== undefined;
  const [storedMode, setMode] = useTableViewMode(
    "dash-address-transactions",
    "pagination",
  );
  const mode = page > 1 ? "pagination" : storedMode;
  const isInfinite = mode === "infinite";
  const transactions = useQuery({
    ...addressTransactionsQueryOptions({
      network,
      address,
      page,
      limit,
      order: "desc",
    }),
    enabled: !searching && !isInfinite,
    placeholderData: keepPreviousData,
  });
  const infinite = useInfiniteQuery({
    ...addressTransactionsInfiniteQueryOptions({
      network,
      address,
      limit,
      order: "desc",
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
  const transaction = useQuery({
    ...transactionQueryOptions({ network, hash: hash ?? "" }),
    enabled: searching && !!lookup.data?.transaction,
  });
  const found = transaction.data;
  const rows = useMemo(() => {
    if (searching)
      return found && belongsToAddress(found, address) ? [found] : [];
    if (!isInfinite) return transactions.data?.resultSet ?? [];
    const seen = new Set<string>();
    return (
      infinite.data?.pages.flatMap((batch) => batch.resultSet) ?? []
    ).filter((transaction) => {
      if (seen.has(transaction.hash)) return false;
      seen.add(transaction.hash);
      return true;
    });
  }, [searching, found, address, isInfinite, transactions.data, infinite.data]);
  const activeQuery = searching
    ? lookup.data?.transaction && !lookup.isError
      ? transaction
      : lookup
    : isInfinite
      ? infinite
      : transactions;
  const columns = useMemo(() => transactionColumns(address), [address]);
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
  const count =
    transactions.data?.pagination.total ??
    infinite.data?.pages[0]?.pagination.total ??
    total;
  const validCount = Number.isSafeInteger(count) && count >= 0;
  const pageCount = validCount ? Math.max(1, Math.ceil(count / limit)) : page;
  const hasMore = infinite.hasNextPage;
  const loadMore = useCallback(() => {
    if (hasMore && !infinite.isFetching && !infinite.isPlaceholderData)
      void infinite.fetchNextPage();
  }, [
    hasMore,
    infinite.isFetching,
    infinite.isPlaceholderData,
    infinite.fetchNextPage,
  ]);
  const changeMode = (next: TableViewMode) => {
    setMode(next);
    if (page !== 1)
      void navigate({ search: { page: 1, limit }, resetScroll: false });
  };
  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2
          id={headingId}
          className="flex items-center gap-2 text-xl font-extrabold"
        >
          Transactions{" "}
          <span className="text-muted-foreground">
            {metricNumber(validCount ? count : null, 0)}
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
        !(isInfinite && !searching && infinite.isFetchNextPageError) && (
          <div role="alert" className="py-4 text-center text-sm">
            <p>Could not load transactions.</p>
            <button
              type="button"
              onClick={() => void activeQuery.refetch()}
              className="mt-2 text-accent underline"
            >
              Retry
            </button>
          </div>
        )}
      <div className="overflow-x-auto">
        <DataTable
          table={table}
          isFetching={activeQuery.isFetching}
          isEmpty={rows.length === 0}
          variant="plain"
          growColumn="hash"
          caption={`Transactions for address ${address}`}
          skeletonRows={searching ? 1 : limit}
          skeletonWidths={["w-52", "w-24", "w-16", "w-28", "w-16", "w-24"]}
          emptyMessage={
            activeQuery.isError
              ? ""
              : searching
                ? "No matching transaction for this address."
                : "No transactions on this page."
          }
          className="min-w-[940px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5 [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_[data-column]:not([data-column=hash]):not([data-column=type])]:text-right [&_td]:tabular-nums"
        />
      </div>
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
