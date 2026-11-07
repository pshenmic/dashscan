import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { LoaderCircle, RefreshCw, X } from "lucide-react";
import { useCallback, useId, useMemo } from "react";
import {
  blockLookupQueryOptions,
  blocksInfiniteQueryOptions,
  blocksQueryOptions,
} from "@/lib/api/blocks";
import { getPageCount, type PageSize } from "@/lib/pagination";
import { appStore } from "@/lib/store";
import {
  type TableViewMode,
  useTableViewMode,
} from "@/lib/use-table-view-mode";
import { BlocksOverview } from "@/themes/dash/components/blocks-overview";
import { BlocksTable } from "@/themes/dash/components/blocks-table";
import { LoadMore } from "@/themes/dash/components/load-more";
import { Pagination } from "@/themes/dash/components/pagination";

export default function BlocksListPage({
  page,
  limit,
  superblock,
  view,
  order,
  height,
  hash,
}: {
  page: number;
  limit: PageSize;
  superblock?: boolean;
  view?: TableViewMode;
  order: "asc" | "desc";
  height?: string;
  hash?: string;
}) {
  const network = useStore(appStore, (state) => state.network);
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/blocks/" });
  const titleId = useId();
  const [storedMode, setStoredMode] = useTableViewMode(
    "dash-blocks",
    "pagination",
  );
  const mode = view ?? (page > 1 ? "pagination" : storedMode);
  const isInfinite = mode === "infinite";
  const lookup = hash ?? height;
  const filteredQuery = useQuery({
    ...blockLookupQueryOptions({ network, value: lookup ?? "" }),
    enabled: lookup !== undefined,
  });
  const infiniteOptions = blocksInfiniteQueryOptions({
    network,
    limit: 25,
    order,
    superblock,
  });
  const pagedQuery = useQuery({
    ...blocksQueryOptions({ network, page, limit, order, superblock }),
    enabled: !isInfinite && lookup === undefined,
    placeholderData: (previous, previousQuery) => {
      if (
        previous &&
        previousQuery?.queryKey[1] === network &&
        previousQuery.queryKey.at(-1) === (superblock ?? null)
      )
        return previous;
      const cached = queryClient.getQueryData(infiniteOptions.queryKey)
        ?.pages[0];
      return cached
        ? { ...cached, resultSet: cached.resultSet.slice(0, limit) }
        : undefined;
    },
    refetchInterval:
      lookup === undefined && !isInfinite && order === "desc" && page === 1
        ? 30_000
        : false,
  });
  const infiniteQuery = useInfiniteQuery({
    ...infiniteOptions,
    enabled: isInfinite && lookup === undefined,
    placeholderData: (previous, previousQuery) => {
      if (
        previous &&
        previousQuery?.queryKey[1] === network &&
        previousQuery.queryKey.at(-1) === (superblock ?? null)
      )
        return previous;
      return pagedQuery.data
        ? { pages: [pagedQuery.data], pageParams: [1] }
        : undefined;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const blocks = useMemo(() => {
    if (lookup !== undefined) {
      const block = filteredQuery.data;
      return block &&
        (height === undefined || block.height === Number(height)) &&
        (superblock === undefined || Boolean(block.superblock) === superblock)
        ? [block]
        : [];
    }
    if (!isInfinite) return pagedQuery.data?.resultSet ?? [];
    const seen = new Set<string>();
    return (
      infiniteQuery.data?.pages.flatMap((batch) => batch.resultSet) ?? []
    ).filter((block) => {
      if (seen.has(block.hash)) return false;
      seen.add(block.hash);
      return true;
    });
  }, [
    lookup,
    filteredQuery.data,
    height,
    superblock,
    isInfinite,
    pagedQuery.data,
    infiniteQuery.data,
  ]);
  const query =
    lookup !== undefined
      ? filteredQuery
      : isInfinite
        ? infiniteQuery
        : pagedQuery;
  const pageCount = getPageCount(
    pagedQuery.data ? { ...pagedQuery.data.pagination, limit } : undefined,
  );
  const loadMore = useCallback(() => {
    if (
      infiniteQuery.hasNextPage &&
      !infiniteQuery.isFetching &&
      !infiniteQuery.isPlaceholderData
    ) {
      void infiniteQuery.fetchNextPage();
    }
  }, [
    infiniteQuery.hasNextPage,
    infiniteQuery.isFetching,
    infiniteQuery.isPlaceholderData,
    infiniteQuery.fetchNextPage,
  ]);

  const changeMode = (next: TableViewMode) => {
    setStoredMode(next);
    void navigate({
      search: { page: 1, limit, superblock, order, view: next, height, hash },
      resetScroll: false,
    });
  };

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
      <BlocksOverview network={network} />
      <section
        aria-labelledby={titleId}
        className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2
            id={titleId}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            {superblock ? "Superblocks" : "Blocks"}
            <LoaderCircle
              aria-hidden="true"
              className={`size-3.5 motion-safe:animate-spin ${query.isFetching ? "" : "invisible"}`}
            />
            <output className="sr-only">
              {query.isFetching ? "Updating blocks…" : ""}
            </output>
          </h2>
          <div className="order-3 flex min-w-0 basis-full flex-wrap items-center gap-2 empty:hidden sm:order-none sm:flex-1 sm:basis-auto sm:justify-end sm:empty:flex">
            {order === "asc" && (
              <button
                type="button"
                aria-label="Reset height sorting"
                onClick={() =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: 1,
                      order: "desc",
                    }),
                    resetScroll: false,
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg bg-action-subtle px-3 py-1 text-xs text-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                Sort: Height · Ascending
                <X className="size-3 shrink-0" aria-hidden="true" />
              </button>
            )}
            {(["height", "hash"] as const).map((kind) => {
              const value = kind === "height" ? height : hash;
              return (
                value !== undefined && (
                  <button
                    key={kind}
                    type="button"
                    aria-label={`Clear ${kind} filter`}
                    title={value}
                    onClick={() =>
                      void navigate({
                        search: (previous) => ({
                          ...previous,
                          page: 1,
                          [kind]: undefined,
                        }),
                        resetScroll: false,
                      })
                    }
                    className="inline-flex max-w-full sm:max-w-64 items-center gap-2 rounded-lg bg-action-subtle px-3 py-1 text-xs text-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="truncate">
                      {kind === "height" ? "Height" : "Block Hash"}: {value}
                    </span>
                    <X className="size-3 shrink-0" aria-hidden="true" />
                  </button>
                )
              );
            })}
            {(lookup !== undefined || order === "asc") && (
              <button
                type="button"
                aria-label="Clear all filters and sorting"
                onClick={() =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: 1,
                      height: undefined,
                      hash: undefined,
                      order: "desc",
                    }),
                    resetScroll: false,
                  })
                }
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                Clear
              </button>
            )}
          </div>
          {isInfinite && lookup === undefined && (
            <button
              type="button"
              disabled={infiniteQuery.isFetching}
              onClick={() =>
                void queryClient.resetQueries({
                  queryKey: infiniteOptions.queryKey,
                  exact: true,
                })
              }
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-accent hover:bg-action-subtle disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Refresh blocks
            </button>
          )}
          <fieldset
            aria-label="Loading mode"
            className="ml-auto inline-flex shrink-0 rounded-xl bg-secondary p-1"
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
        {query.isError &&
          !(
            lookup === undefined &&
            isInfinite &&
            infiniteQuery.isFetchNextPageError
          ) && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {blocks.length
                ? "Could not refresh blocks. Showing previous data."
                : "Could not load blocks."}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void query.refetch()}
              >
                Try again
              </button>
            </p>
          )}
        <BlocksTable
          blocks={blocks}
          order={order}
          onOrderChange={(next) =>
            void navigate({
              search: {
                page: 1,
                limit,
                superblock,
                view: mode,
                order: next,
                height,
                hash,
              },
              resetScroll: false,
            })
          }
          busy={query.isFetching}
          emptyMessage={
            query.isPending
              ? "Loading blocks…"
              : query.isError
                ? "Blocks unavailable"
                : "No blocks found."
          }
        />
        {lookup === undefined &&
          (isInfinite
            ? infiniteQuery.hasNextPage && (
                <LoadMore
                  loading={infiniteQuery.isFetching}
                  failed={infiniteQuery.isError}
                  onLoad={loadMore}
                />
              )
            : pageCount > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <Pagination
                    align="end"
                    page={page}
                    pageCount={pageCount}
                    onPageChange={(next) =>
                      void navigate({
                        search: {
                          page: next,
                          limit,
                          superblock,
                          order,
                          view: mode,
                        },
                        resetScroll: false,
                      })
                    }
                    pageSize={limit}
                    onPageSizeChange={(size) =>
                      void navigate({
                        search: {
                          page: 1,
                          limit: size,
                          superblock,
                          order,
                          view: mode,
                        },
                        resetScroll: false,
                      })
                    }
                  />
                </div>
              ))}
      </section>
    </main>
  );
}
