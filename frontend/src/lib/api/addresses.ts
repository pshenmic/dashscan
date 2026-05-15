import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type {
  ApiAddress,
  ApiAddressBalanceEntry,
  ApiAddressBalancePoint,
  ApiAddressDetail,
  ApiTransaction,
  ApiUtxoEntry,
  PaginatedResponse,
  PaginationParams,
} from "./types";

interface FetchAddressesInput extends PaginationParams {
  network: Network;
}

async function getAddresses(params: FetchAddressesInput) {
  const url = new URL("/addresses", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiAddress>>;
}

export const fetchAddresses = createServerFn({ method: "POST" })
  .inputValidator((input: FetchAddressesInput) => input)
  .handler(({ data }) => getAddresses(data));

export function addressesQueryOptions(params: FetchAddressesInput) {
  return queryOptions({
    queryKey: [
      "addresses",
      params.network,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getAddresses(params),
  });
}

interface FetchAddressInput {
  network: Network;
  address: string;
}

async function getAddress(params: FetchAddressInput) {
  const url = new URL(`/address/${params.address}`, getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiAddressDetail>;
}

export const fetchAddress = createServerFn({ method: "POST" })
  .inputValidator((input: FetchAddressInput) => input)
  .handler(({ data }) => getAddress(data));

export function addressQueryOptions(params: FetchAddressInput) {
  return queryOptions({
    queryKey: ["address", params.network, params.address],
    queryFn: () => getAddress(params),
  });
}

interface FetchAddressTransactionsInput
  extends PaginationParams,
    FetchAddressInput {}

async function getAddressTransactions(params: FetchAddressTransactionsInput) {
  const url = new URL(
    `/address/${params.address}/transactions`,
    getBaseUrl(params.network),
  );
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiTransaction>>;
}

export const fetchAddressTransactions = createServerFn({ method: "POST" })
  .inputValidator((input: FetchAddressTransactionsInput) => input)
  .handler(({ data }) => getAddressTransactions(data));

export function addressTransactionsQueryOptions(
  params: FetchAddressTransactionsInput,
) {
  return queryOptions({
    queryKey: [
      "address-transactions",
      params.network,
      params.address,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getAddressTransactions(params),
  });
}

interface InfiniteAddressTransactionsInput extends FetchAddressInput {
  limit?: number;
  order?: "asc" | "desc";
}

export function addressTransactionsInfiniteQueryOptions(
  params: InfiniteAddressTransactionsInput,
) {
  const limit = params.limit ?? 25;
  const order = params.order ?? "desc";
  return infiniteQueryOptions({
    queryKey: [
      "address-transactions-infinite",
      params.network,
      params.address,
      limit,
      order,
    ],
    queryFn: ({ pageParam }) =>
      getAddressTransactions({
        network: params.network,
        address: params.address,
        page: pageParam,
        limit,
        order,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, limit: pageLimit, total } = lastPage.pagination;
      return page * pageLimit < total ? page + 1 : undefined;
    },
  });
}

interface FetchAddressBalanceChartInput extends FetchAddressInput {
  timestampStart: string;
  timestampEnd: string;
  intervalsCount?: number;
}

async function getAddressBalanceChart(params: FetchAddressBalanceChartInput) {
  const base = getBaseUrl(params.network);
  const buildUrl = (path: string) => {
    const url = new URL(path, base);
    url.searchParams.set("timestamp_start", params.timestampStart);
    url.searchParams.set("timestamp_end", params.timestampEnd);
    if (params.intervalsCount !== undefined) {
      url.searchParams.set("intervals_count", String(params.intervalsCount));
    }
    return url;
  };

  let response = await fetch(
    buildUrl(`/address/${params.address}/balance/chart`),
  );
  if (response.status === 404) {
    response = await fetch(
      buildUrl(`/address/${params.address}/balance/history`),
    );
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiAddressBalancePoint[]>;
}

export const fetchAddressBalanceChart = createServerFn({ method: "POST" })
  .inputValidator((input: FetchAddressBalanceChartInput) => input)
  .handler(({ data }) => getAddressBalanceChart(data));

export function addressBalanceChartQueryOptions(
  params: FetchAddressBalanceChartInput,
) {
  return queryOptions({
    queryKey: [
      "address-balance-chart",
      params.network,
      params.address,
      params.timestampStart,
      params.timestampEnd,
      params.intervalsCount,
    ],
    queryFn: () => getAddressBalanceChart(params),
  });
}

interface FetchAddressUtxosInput extends PaginationParams {
  network: Network;
  address: string;
}

async function getAddressUtxos(params: FetchAddressUtxosInput) {
  const url = new URL(
    `/address/${params.address}/utxo`,
    getBaseUrl(params.network),
  );
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiUtxoEntry>>;
}

export const fetchAddressUtxos = createServerFn({ method: "POST" })
  .inputValidator((input: FetchAddressUtxosInput) => input)
  .handler(({ data }) => getAddressUtxos(data));

export function addressUtxosQueryOptions(params: FetchAddressUtxosInput) {
  return queryOptions({
    queryKey: [
      "address-utxos",
      params.network,
      params.address,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getAddressUtxos(params),
  });
}

interface FetchRichListInput extends PaginationParams {
  network: Network;
}

async function getRichList(params: FetchRichListInput) {
  const url = new URL("/addresses/rich-list", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiAddressBalanceEntry>>;
}

export const fetchRichList = createServerFn({ method: "POST" })
  .inputValidator((input: FetchRichListInput) => input)
  .handler(({ data }) => getRichList(data));

export function richListQueryOptions(params: FetchRichListInput) {
  return queryOptions({
    queryKey: [
      "rich-list",
      params.network,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getRichList(params),
  });
}
