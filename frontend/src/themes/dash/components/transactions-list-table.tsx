import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, LockKeyhole, X } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { searchQueryOptions } from "@/lib/api/search";
import {
  transactionsInfiniteQueryOptions,
  transactionsQueryOptions,
} from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import type { Network } from "@/lib/store";
import { TRANSACTION_TYPES } from "@/lib/transaction-types";
import {
  type TableViewMode,
  useTableViewMode,
} from "@/lib/use-table-view-mode";
import { metricBytes, metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";
import type { TransactionsListSearch } from "@/themes/dash/pages/transactions-list";
import { BlockAge } from "./block-age";
import { ColumnSearch } from "./column-search";
import { DataTable } from "./data-table";
import { FormattedAmount } from "./formatted-amount";
import { IdentifierLink } from "./identifier-link";
import { LoadMore } from "./load-more";
import { Pagination } from "./pagination";
import { TransactionTypeBadge } from "./transaction-type-badge";

export function TransactionsListTable({
  network,
  search,
}: {
  network: Network;
  search: TransactionsListSearch;
}) {
  const hydrated = useHydrated();
  const navigate = useNavigate({ from: "/transactions/" });
  const titleId = useId();
  const [attributesOpen, setAttributesOpen] = useState(false);
  const queryClient = useQueryClient();
  const [storedMode, setMode] = useTableViewMode(
    "dash-transactions",
    "pagination",
  );
  const mode = search.view ?? (search.page > 1 ? "pagination" : storedMode);
  const isInfinite = mode === "infinite";
  const searching = search.hash !== undefined;
  const params = {
    network,
    limit: search.limit,
    order: search.order,
    transactionType: search.transaction_type,
    coinjoin: search.coinjoin,
    multisig: search.multisig,
    blockHeight: search.block_height,
  };
  const infiniteOptions = transactionsInfiniteQueryOptions(params);
  const pagedOptions = transactionsQueryOptions({
    ...params,
    page: search.page,
  });
  const paged = useQuery({
    ...pagedOptions,
    enabled: !searching && !isInfinite,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === network &&
      JSON.stringify(previousQuery.queryKey.slice(5)) ===
        JSON.stringify(pagedOptions.queryKey.slice(5))
        ? previous
        : undefined,
    refetchInterval:
      !isInfinite && !searching && search.page === 1 && search.order === "desc"
        ? 30_000
        : false,
  });
  const infinite = useInfiniteQuery({
    ...infiniteOptions,
    enabled: !searching && isInfinite,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const lookup = useQuery({
    ...searchQueryOptions({ network, query: search.hash ?? "" }),
    enabled: searching,
  });
  const rows = useMemo(() => {
    if (searching) {
      const found = lookup.data?.transaction;
      return found &&
        (search.transaction_type === undefined ||
          found.type === search.transaction_type) &&
        (search.coinjoin === undefined || found.coinjoin === search.coinjoin) &&
        (search.multisig === undefined || found.multisig === search.multisig) &&
        (search.block_height === undefined ||
          found.blockHeight === search.block_height)
        ? [found]
        : [];
    }
    if (!isInfinite) return paged.data?.resultSet ?? [];
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
    lookup.data,
    search.transaction_type,
    search.coinjoin,
    search.multisig,
    search.block_height,
    isInfinite,
    paged.data,
    infinite.data,
  ]);
  const update = useCallback(
    (patch: Partial<TransactionsListSearch>) => {
      void navigate({
        search: (previous) => ({ ...previous, page: 1, ...patch }),
        resetScroll: false,
      });
    },
    [navigate],
  );
  const columns = useMemo<ColumnDef<ApiTransaction>[]>(
    () => [
      {
        accessorKey: "hash",
        header: () => (
          <ColumnSearch
            kind="hash"
            label="Transaction Hash"
            activeValue={search.hash}
            onChange={(hash) => update({ hash })}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 max-sm:w-36">
            <div className="min-w-0 flex-1">
              <IdentifierLink
                kind="transaction"
                value={row.original.hash}
                prefix={
                  <img
                    src="/icons/home/transaction.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 shrink-0"
                  />
                }
              />
            </div>
            <span className="flex size-6 shrink-0 items-center justify-center">
              {row.original.instantLock && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="InstantSend locked"
                      className="rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <LockKeyhole className="size-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    InstantSend locked. A masternode quorum has locked the
                    transaction inputs to prevent double-spending.
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: () => (
          <Popover>
            <span className="inline-flex items-center gap-1">
              Type
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter: Type"
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ChevronDown className="size-3" aria-hidden="true" />
                </button>
              </PopoverTrigger>
            </span>
            <PopoverContent
              align="start"
              className="max-h-80 w-56 overflow-y-auto p-2"
            >
              <fieldset aria-label="Transaction type" className="space-y-1">
                {[
                  { name: undefined, label: "All types" },
                  ...TRANSACTION_TYPES,
                ].map((type) => (
                  <label
                    key={type.name ?? "all"}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
                  >
                    <input
                      type="radio"
                      name="transaction-type"
                      checked={search.transaction_type === type.name}
                      onChange={() => update({ transaction_type: type.name })}
                    />
                    {type.label}
                  </label>
                ))}
              </fieldset>
            </PopoverContent>
          </Popover>
        ),
        cell: ({ row }) => <TransactionTypeBadge type={row.original.type} />,
      },
      {
        accessorKey: "blockHeight",
        header: () => (
          <ColumnSearch
            kind="height"
            label="Block"
            activeValue={search.block_height?.toString()}
            onChange={(value) =>
              update({
                block_height: value === undefined ? undefined : Number(value),
              })
            }
            sorting={{
              order: search.order,
              onChange: (order) => update({ order }),
            }}
          />
        ),
        cell: ({ row }) =>
          row.original.blockHash ? (
            <Link
              to="/blocks/$hashOrHeight"
              params={{ hashOrHeight: row.original.blockHash }}
              className="text-brand hover:underline"
            >
              {metricNumber(row.original.blockHeight, 0)}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        id: "attributes",
        header: () => (
          <Popover open={attributesOpen} onOpenChange={setAttributesOpen}>
            <span className="inline-flex items-center gap-1">
              Attributes
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter: Attributes"
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ChevronDown className="size-3" aria-hidden="true" />
                </button>
              </PopoverTrigger>
            </span>
            <PopoverContent align="start" className="w-48 p-2">
              <fieldset
                aria-label="Transaction attributes"
                className="space-y-1"
              >
                {(
                  [
                    ["coinjoin", "CoinJoin", search.coinjoin],
                    ["multisig", "Multisig", search.multisig],
                  ] as const
                ).map(([key, label, value]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={value === true}
                      onChange={(event) =>
                        update({
                          [key]: event.target.checked ? true : undefined,
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            </PopoverContent>
          </Popover>
        ),
        cell: ({ row }) => {
          const attributes = [
            row.original.coinjoin && "CoinJoin",
            row.original.multisig && "Multisig",
          ].filter(Boolean);
          return attributes.length ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              {attributes.map((attribute) => (
                <span
                  key={String(attribute)}
                  className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground"
                >
                  {attribute}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "size",
        header: "Size",
        cell: ({ row }) => metricBytes(row.original.size),
      },
      {
        accessorKey: "amount",
        header: () => (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                Output total (DASH)
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Sum of all outputs, including change. This is not the transaction
              fee.
            </TooltipContent>
          </Tooltip>
        ),
        cell: ({ row }) => (
          <FormattedAmount
            value={transactionAmount(row.original.amount).replace(/ DASH$/, "")}
          />
        ),
      },
      {
        accessorKey: "confirmations",
        header: "Confirmations",
        cell: ({ row }) => metricNumber(row.original.confirmations, 0),
      },
      {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: ({ row }) =>
          row.original.timestamp ? (
            <BlockAge
              timestamp={row.original.timestamp}
              blockHeight={row.original.blockHeight}
            />
          ) : (
            "—"
          ),
      },
    ],
    [
      search.hash,
      search.block_height,
      search.order,
      search.transaction_type,
      search.coinjoin,
      search.multisig,
      attributesOpen,
      update,
    ],
  );
  const table = useReactTable({
    data: rows,
    columns,
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.hash,
  });
  const query = searching ? lookup : isInfinite ? infinite : paged;
  const isFetching = hydrated && query.isFetching;
  const hasNextPage = paged.data?.resultSet.length === search.limit;
  const loadMore = useCallback(() => {
    if (
      infinite.hasNextPage &&
      !infinite.isFetching &&
      !infinite.isPlaceholderData
    )
      void infinite.fetchNextPage();
  }, [
    infinite.hasNextPage,
    infinite.isFetching,
    infinite.isPlaceholderData,
    infinite.fetchNextPage,
  ]);
  const changeMode = (next: TableViewMode) => {
    if (
      next === "infinite" &&
      !queryClient.getQueryData(infiniteOptions.queryKey) &&
      !paged.isPlaceholderData &&
      paged.data?.pagination.page === 1
    )
      queryClient.setQueryData(infiniteOptions.queryKey, {
        pages: [paged.data],
        pageParams: [1],
      });
    if (
      next === "pagination" &&
      !queryClient.getQueryData(
        transactionsQueryOptions({ ...params, page: 1 }).queryKey,
      ) &&
      infinite.data?.pages[0]
    )
      queryClient.setQueryData(
        transactionsQueryOptions({ ...params, page: 1 }).queryKey,
        infinite.data.pages[0],
      );
    setMode(next);
    update({ view: next });
  };
  const filters = [
    { key: "hash" as const, label: "Hash", value: search.hash },
    {
      key: "block_height" as const,
      label: "Block",
      value: search.block_height,
    },
    {
      key: "transaction_type" as const,
      label: "Type",
      value: TRANSACTION_TYPES.find(
        (type) => type.name === search.transaction_type,
      )?.label,
    },
    {
      key: "coinjoin" as const,
      label: "CoinJoin",
      value:
        search.coinjoin === undefined
          ? undefined
          : search.coinjoin
            ? "Included"
            : "Excluded",
    },
    {
      key: "multisig" as const,
      label: "Multisig",
      value:
        search.multisig === undefined
          ? undefined
          : search.multisig
            ? "Included"
            : "Excluded",
    },
  ].filter((filter) => filter.value !== undefined);
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
          Transactions{" "}
          <span
            className="text-muted-foreground tabular-nums"
            title="Loaded transactions"
          >
            {metricNumber(rows.length, 0)}
          </span>
          <output className="sr-only">
            {isFetching ? "Updating transactions…" : ""}
          </output>
        </h2>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              title={String(filter.value)}
              aria-label={`Clear ${filter.label} filter`}
              onClick={() => update({ [filter.key]: undefined })}
              className="inline-flex max-w-48 items-center gap-2 rounded-lg bg-action-subtle px-3 py-1 text-xs text-accent"
            >
              <span className="truncate">
                {filter.label}: {filter.value}
              </span>
              <X className="size-3 shrink-0" aria-hidden="true" />
            </button>
          ))}
          {isInfinite && !searching && (
            <button
              type="button"
              disabled={isFetching}
              onClick={() =>
                void queryClient.resetQueries({
                  queryKey: infiniteOptions.queryKey,
                  exact: true,
                })
              }
              className="rounded-lg px-3 py-1.5 text-xs text-accent hover:bg-action-subtle disabled:opacity-50"
            >
              Refresh transactions
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
      {(filters.length > 0 || search.order !== "desc") && (
        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs">
          {search.order === "asc" && (
            <button
              type="button"
              onClick={() => update({ order: "desc" })}
              className="text-accent"
            >
              Oldest blocks first ×
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              update({
                hash: undefined,
                block_height: undefined,
                transaction_type: undefined,
                coinjoin: undefined,
                multisig: undefined,
                order: "desc",
              })
            }
            className="text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        </div>
      )}
      {query.isError &&
        !(isInfinite && !searching && infinite.isFetchNextPageError) && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {rows.length
              ? "Could not refresh transactions. Showing previous data."
              : "Could not load transactions."}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void query.refetch()}
            >
              Retry
            </button>
          </p>
        )}
      <div className="overflow-x-auto">
        <DataTable
          table={table}
          isFetching={isFetching}
          isEmpty={!rows.length}
          variant="plain"
          growColumn="hash"
          caption="Indexed transactions, ordered by block height. Output totals include change; timestamps come from containing blocks."
          skeletonRows={searching ? 1 : search.limit}
          skeletonWidths={[
            "w-52",
            "w-24",
            "w-24",
            "w-24",
            "w-16",
            "w-28",
            "w-16",
            "w-20",
          ]}
          emptyMessage={
            query.isPending
              ? "Loading transactions…"
              : query.isError
                ? "Transactions unavailable"
                : "No matching transactions."
          }
          className="max-sm:w-max sm:min-w-[1120px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5 [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_[data-column]:not([data-column=hash]):not([data-column=type]):not([data-column=attributes])]:text-right [&_td]:tabular-nums"
        />
      </div>
      {!searching && isInfinite && infinite.hasNextPage && (
        <LoadMore
          loading={isFetching}
          failed={infinite.isFetchNextPageError}
          onLoad={loadMore}
          errorMessage="Could not load more transactions."
        />
      )}
      {!searching && !isInfinite && (
        <Pagination
          page={search.page}
          hasNextPage={hasNextPage}
          disabled={
            isFetching ||
            paged.isPlaceholderData ||
            paged.isError ||
            !paged.data
          }
          pageSize={search.limit}
          align="end"
          onPageChange={(page) => update({ page, view: "pagination" })}
          onPageSizeChange={(limit) => update({ limit })}
        />
      )}
    </section>
  );
}
