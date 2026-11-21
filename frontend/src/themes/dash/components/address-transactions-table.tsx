import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { type RefObject, useCallback, useId, useMemo, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import {
  addressTransactionsInfiniteQueryOptions,
  addressTransactionsQueryOptions,
} from "@/lib/api/addresses";
import { searchQueryOptions } from "@/lib/api/search";
import { transactionQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import type { PageSize } from "@/lib/pagination";
import type { Network } from "@/lib/store";
import {
  getTransactionType,
  getTxTypeLabel,
  TRANSACTION_TYPES,
  type TransactionTypeFilter,
} from "@/lib/transaction-types";
import {
  type TableViewMode,
  useTableViewMode,
} from "@/lib/use-table-view-mode";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";
import { ColumnSearch } from "./column-search";
import { DataTable } from "./data-table";
import { FormattedAmount } from "./formatted-amount";
import { IdentifierLink } from "./identifier-link";
import { InfoPopover } from "./info-popover";
import { LoadMore } from "./load-more";
import { Pagination } from "./pagination";
import { TransactionTypeBadge } from "./transaction-type-badge";

const toolbarChipClass =
  "inline-flex h-9 max-w-48 items-center gap-2 rounded-xl bg-secondary px-3 text-xs text-foreground hover:bg-action-subtle hover:text-accent focus-visible:outline-2 focus-visible:outline-ring";

function TypeFilter({
  value,
  onChange,
  trigger,
}: {
  value: TransactionTypeFilter | undefined;
  onChange: (value: string) => void;
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <Select value={value ?? "all"} onValueChange={onChange}>
      <SelectTrigger
        ref={trigger}
        size="sm"
        aria-label="Filter: Type"
        data-active={value !== undefined}
        className="data-[size=sm]:h-6 gap-1 border-0 px-1 py-0 shadow-none hover:bg-action-subtle data-[active=true]:text-accent dark:bg-transparent"
      >
        Type
      </SelectTrigger>
      <SelectContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus({ preventScroll: true });
        }}
        position="popper"
        align="start"
        collisionPadding={8}
        aria-label="Transaction type"
        className="w-52 max-h-[min(20rem,var(--radix-select-content-available-height))] rounded-xl [&_[data-slot=select-item]]:h-9 [&_[data-slot=select-item]:focus]:bg-action-subtle [&_[data-slot=select-item]:focus]:text-foreground"
      >
        <SelectItem value="all">All types</SelectItem>
        <SelectSeparator />
        {TRANSACTION_TYPES.map((type) => (
          <SelectItem key={type.name} value={type.name} textValue={type.label}>
            <TransactionTypeBadge type={type.name} withTooltip={false} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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

function transactionColumns(
  address: string,
  transactionType: TransactionTypeFilter | undefined,
  onTypeChange: (value: string) => void,
  order: "asc" | "desc",
  onOrderChange: () => void,
  typeTrigger: RefObject<HTMLButtonElement | null>,
): ColumnDef<ApiTransaction>[] {
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
      header: () => (
        <TypeFilter
          value={transactionType}
          onChange={onTypeChange}
          trigger={typeTrigger}
        />
      ),
      cell: ({ row }) => <TransactionTypeBadge type={row.original.type} />,
    },
    {
      id: "amount",
      header: () => (
        <InfoPopover label="Net change (DASH)" trigger="Net change (DASH)">
          Outputs received minus inputs spent by this address, in DASH.
        </InfoPopover>
      ),
      cell: ({ row }) => {
        const value = netChange(row.original, address);
        if (value == null) return "—";
        return (
          <span className="inline-flex items-baseline tabular-nums">
            <span
              className={
                value > 0 ? "text-success" : value < 0 ? "text-destructive" : ""
              }
            >
              {value > 0 ? "+" : value < 0 ? "−" : ""}
            </span>
            <FormattedAmount value={metricDuffs(Math.abs(value))} />
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
      header: () => (
        <button
          type="button"
          aria-label={
            order === "desc"
              ? "Newest blocks first. Show oldest first"
              : "Oldest blocks first. Show newest first"
          }
          onClick={onOrderChange}
          className="inline-flex items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-ring"
        >
          Timestamp
          {order === "desc" ? (
            <ArrowDown className="size-3.5" aria-hidden="true" />
          ) : (
            <ArrowUp className="size-3.5" aria-hidden="true" />
          )}
        </button>
      ),
      cell: ({ row }) => {
        const timestamp = row.original.timestamp;
        if (!timestamp || !Number.isFinite(Date.parse(timestamp)))
          return row.original.confirmations === 0 ? "Pending" : "—";
        return (
          <BlockAge
            timestamp={timestamp}
            blockHeight={row.original.blockHeight}
          />
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
  const search = useSearch({ from: "/address/$address" });
  const { hash, type: transactionType } = search;
  const order = search.order ?? "desc";
  const setHash = useCallback(
    (value: string | undefined) => {
      void navigate({
        search: (previous) => ({ ...previous, hash: value, page: 1 }),
        resetScroll: false,
      });
    },
    [navigate],
  );
  const changeType = useCallback(
    (value: string) => {
      const type = TRANSACTION_TYPES.find(
        (entry) => entry.name === value,
      )?.name;
      void navigate({
        search: (previous) => ({ ...previous, type, page: 1 }),
        resetScroll: false,
      });
    },
    [navigate],
  );
  const changeOrder = useCallback(() => {
    void navigate({
      search: (previous) => ({
        ...previous,
        order: order === "desc" ? "asc" : "desc",
        page: 1,
      }),
      resetScroll: false,
    });
  }, [navigate, order]);
  const headingId = useId();
  const typeTrigger = useRef<HTMLButtonElement>(null);
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
      order,
      transactionType,
    }),
    enabled: !searching && !isInfinite,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[5] === order &&
      previousQuery?.queryKey[6] === transactionType
        ? previous
        : undefined,
  });
  const infinite = useInfiniteQuery({
    ...addressTransactionsInfiniteQueryOptions({
      network,
      address,
      limit,
      order,
      transactionType,
    }),
    enabled: !searching && isInfinite,
    staleTime: 30_000,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === limit &&
      previousQuery?.queryKey[4] === order &&
      previousQuery?.queryKey[5] === transactionType
        ? previous
        : !transactions.isPlaceholderData &&
            transactions.data?.pagination.page === 1
          ? { pages: [transactions.data], pageParams: [1] }
          : undefined,
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
      return found &&
        belongsToAddress(found, address) &&
        (!transactionType ||
          getTransactionType(found.type)?.name === transactionType)
        ? [found]
        : [];
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
    address,
    transactionType,
    isInfinite,
    transactions.data,
    infinite.data,
  ]);
  const activeQuery = searching
    ? lookup.data?.transaction && !lookup.isError
      ? transaction
      : lookup
    : isInfinite
      ? infinite
      : transactions;
  const columns = useMemo(
    () =>
      transactionColumns(
        address,
        transactionType,
        changeType,
        order,
        changeOrder,
        typeTrigger,
      ),
    [address, transactionType, changeType, order, changeOrder],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      globalFilter: hash,
      sorting: [{ id: "timestamp", desc: order === "desc" }],
    },
    onGlobalFilterChange: setHash,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.hash,
  });
  const currentData = isInfinite ? infinite.data?.pages[0] : transactions.data;
  const count = searching
    ? activeQuery.isPending || activeQuery.isError
      ? null
      : rows.length
    : (currentData?.pagination.total ?? (transactionType ? null : total));
  const validCount = count != null && Number.isSafeInteger(count) && count >= 0;
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
      void navigate({
        search: (previous) => ({ ...previous, page: 1, limit }),
        resetScroll: false,
      });
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
          {transactionType && (
            <button
              type="button"
              aria-label="Clear transaction type filter"
              onClick={() => changeType("all")}
              className={toolbarChipClass}
            >
              <span className="truncate">
                Type: {getTxTypeLabel(transactionType)}
              </span>
              <X className="size-3" aria-hidden="true" />
            </button>
          )}
          {hash && (
            <button
              type="button"
              aria-label="Clear transaction hash filter"
              title={hash}
              onClick={() => setHash(undefined)}
              className={toolbarChipClass}
            >
              <span className="truncate">Hash: {hash}</span>
              <X className="size-3 shrink-0" aria-hidden="true" />
            </button>
          )}
          <fieldset
            aria-label="Loading mode"
            className="inline-flex shrink-0 rounded-xl bg-secondary p-1"
            disabled={searching}
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
      <div className="relative overflow-x-auto">
        <DataTable
          table={table}
          isFetching={activeQuery.isFetching}
          isEmpty={rows.length === 0}
          variant="plain"
          growColumn="hash"
          caption={`Transactions for address ${address}`}
          skeletonRows={searching ? 1 : limit}
          skeletonWidths={["w-52", "w-24", "w-28", "w-16", "w-24"]}
          emptyMessage={
            activeQuery.isError
              ? ""
              : searching
                ? "No matching transaction for this address."
                : "No transactions on this page."
          }
          className="min-w-[800px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5 [&_th]:bg-surface-subtle [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_[data-column]:not([data-column=hash]):not([data-column=type])]:text-right [&_td]:h-12 [&_td]:tabular-nums"
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
              search: (previous) => ({ ...previous, page: nextPage, limit }),
              resetScroll: false,
            })
          }
          onPageSizeChange={(nextLimit) =>
            void navigate({
              search: (previous) => ({
                ...previous,
                page: 1,
                limit: nextLimit,
              }),
              resetScroll: false,
            })
          }
        />
      )}
    </section>
  );
}
