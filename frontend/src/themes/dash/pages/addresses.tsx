import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId, useMemo } from "react";
import {
  addressRankingInfiniteQueryOptions,
  addressRankingQueryOptions,
} from "@/lib/api/address-ranking";
import { lookupAddress } from "@/lib/api/addresses";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { useAddressUsdPrice } from "@/themes/dash/components/address-balance";
import { AddressesOverview } from "@/themes/dash/components/addresses-overview";
import { AddressesTable } from "@/themes/dash/components/addresses-table";
import { LoadMore } from "@/themes/dash/components/load-more";
import { Pagination } from "@/themes/dash/components/pagination";

export default function AddressesPage() {
  const network = useStore(appStore, (state) => state.network);
  return <AddressList key={network} />;
}

function AddressList() {
  const titleId = useId();
  const queryClient = useQueryClient();
  const network = useStore(appStore, (state) => state.network);
  const usdPrice = useAddressUsdPrice(network);
  const search = useSearch({ from: "/addresses" });
  const navigate = useNavigate({ from: "/addresses" });
  const page = search.page ?? 1;
  const limit = search.limit ?? 25;
  const order = search.order ?? "desc";
  const [storedMode, setMode] = useTableViewMode(
    "dash-addresses",
    "pagination",
  );
  const mode = search.view ?? (page > 1 ? "pagination" : storedMode);
  const infinite = mode === "infinite";
  const params = {
    network,
    limit,
    order,
  };
  const infiniteOptions = addressRankingInfiniteQueryOptions(params);
  const address = search.address;
  const detail = useQuery({
    queryKey: ["address-lookup", network, address],
    queryFn: ({ signal }) =>
      address ? lookupAddress({ network, address }, signal) : null,
    enabled: !!address,
  });
  const paged = useQuery({
    ...addressRankingQueryOptions(params, page),
    enabled: !address && !infinite,
    placeholderData: (previous, previousQuery) => {
      const previousParams = previousQuery?.queryKey[1] as
        | typeof params
        | undefined;
      return previousParams?.network === network &&
        previousParams.order === order &&
        previousParams.limit === limit
        ? previous
        : undefined;
    },
  });
  const scrolling = useInfiniteQuery({
    ...infiniteOptions,
    enabled: !address && infinite,
  });
  const query = address ? detail : infinite ? scrolling : paged;
  const data = infinite ? scrolling.data?.pages[0] : paged.data;
  const rows = useMemo(() => {
    if (address)
      return detail.data
        ? [
            {
              address: detail.data.address,
              balance: detail.data.balance,
              txCount: Number(detail.data.txCount),
            },
          ]
        : [];
    const entries = infinite
      ? (scrolling.data?.pages.flatMap((batch) => batch?.resultSet ?? []) ?? [])
      : (paged.data?.resultSet ?? []);
    const seen = new Set<string>();
    return entries.filter((entry) => {
      if (!entry.address || seen.has(entry.address)) return false;
      seen.add(entry.address);
      return true;
    });
  }, [address, detail.data, infinite, scrolling.data, paged.data]);
  const total = data?.pagination.total;
  const pageCount = total != null && total >= 0 ? Math.ceil(total / limit) : 0;
  const update = (patch: Partial<typeof search>) =>
    void navigate({
      search: (previous) => ({ ...previous, page: 1, ...patch }),
      resetScroll: false,
    });
  const changeMode = (next: "pagination" | "infinite") => {
    if (
      next === "infinite" &&
      !queryClient.getQueryData(infiniteOptions.queryKey) &&
      !paged.isPlaceholderData &&
      paged.data?.pagination.page === 1 &&
      paged.data.pagination.limit === limit
    ) {
      queryClient.setQueryData(infiniteOptions.queryKey, {
        pages: [paged.data],
        pageParams: [1],
      });
    }
    const firstPageOptions = addressRankingQueryOptions(params, 1);
    if (
      next === "pagination" &&
      !queryClient.getQueryData(firstPageOptions.queryKey) &&
      scrolling.data?.pages[0]
    ) {
      queryClient.setQueryData(
        firstPageOptions.queryKey,
        scrolling.data.pages[0],
      );
    }
    setMode(next);
    update({ view: next });
  };
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
      <h1 className="dash-heading-page sm:dash-heading-hero">
        <span className="font-extrabold text-brand">Addresses</span> Stats
      </h1>
      <AddressesOverview network={network} />
      <section
        aria-labelledby={titleId}
        className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2
            id={titleId}
            className="text-sm font-medium text-muted-foreground"
          >
            {address ? "Address search" : "Addresses by balance"}
          </h2>
          {address ? (
            <button
              type="button"
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() =>
                void navigate({
                  search: (previous) => ({ ...previous, address: undefined }),
                  replace: true,
                  resetScroll: false,
                })
              }
            >
              Clear filter
            </button>
          ) : (
            <fieldset
              aria-label="Loading mode"
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
          )}
        </div>
        {query.isError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {rows.length
              ? "Could not update addresses."
              : "Could not load addresses."}{" "}
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="underline"
            >
              Try again
            </button>
          </p>
        )}
        <AddressesTable
          rows={rows}
          usdPrice={usdPrice}
          order={order}
          onOrderChange={address ? undefined : (order) => update({ order })}
          busy={query.isFetching}
          emptyMessage={
            query.isError
              ? "Addresses unavailable"
              : address
                ? "Address not found."
                : "No addresses found."
          }
          limit={address ? 1 : limit}
        />
        {address
          ? null
          : infinite
            ? scrolling.hasNextPage && (
                <LoadMore
                  errorMessage="Could not load more addresses."
                  loading={scrolling.isFetching}
                  failed={scrolling.isFetchNextPageError}
                  onLoad={() => {
                    if (!scrolling.isFetching) void scrolling.fetchNextPage();
                  }}
                />
              )
            : pageCount > 0 && (
                <div className="mt-4">
                  <Pagination
                    align="end"
                    page={page}
                    pageCount={pageCount}
                    pageSize={limit}
                    onPageChange={(next) =>
                      update({ page: next, view: "pagination" })
                    }
                    onPageSizeChange={(size) => update({ limit: size })}
                  />
                </div>
              )}
      </section>
    </main>
  );
}
