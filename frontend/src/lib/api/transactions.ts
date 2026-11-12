import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import type { TransactionTypeFilter } from "@/lib/transaction-types";
import { apiFetch, getBaseUrl } from "./client";
import type {
  ApiTransaction,
  PaginatedResponse,
  PaginationParams,
} from "./types";

export {
  TRANSACTION_TYPE_VALUES,
  type TransactionTypeFilter,
} from "@/lib/transaction-types";

interface TransactionsFilterParams {
  transactionType?: TransactionTypeFilter;
  coinjoin?: boolean;
  multisig?: boolean;
  blockHeight?: number;
}

interface FetchTransactionsInput
  extends PaginationParams,
    TransactionsFilterParams {
  network: Network;
}

function applyTxFilters(url: URL, params: TransactionsFilterParams) {
  if (params.transactionType !== undefined) {
    url.searchParams.set("transaction_type", params.transactionType);
  }
  if (params.coinjoin !== undefined) {
    url.searchParams.set("coinjoin", String(params.coinjoin));
  }
  if (params.multisig !== undefined) {
    url.searchParams.set("multisig", String(params.multisig));
  }
  if (params.blockHeight !== undefined) {
    url.searchParams.set("block_height", String(params.blockHeight));
  }
}

async function getTransactions(
  params: FetchTransactionsInput,
  signal?: AbortSignal,
) {
  const url = new URL("/transactions", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);
  applyTxFilters(url, params);

  const response = await apiFetch(url, { signal });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiTransaction>>;
}

export const fetchTransactions = createServerFn({ method: "POST" })
  .inputValidator((input: FetchTransactionsInput) => input)
  .handler(({ data }) => getTransactions(data));

export function transactionsQueryOptions(params: FetchTransactionsInput) {
  return queryOptions({
    queryKey: [
      "transactions",
      params.network,
      params.page,
      params.limit,
      params.order,
      params.transactionType ?? null,
      params.coinjoin ?? null,
      params.multisig ?? null,
      params.blockHeight ?? null,
    ],
    queryFn: ({ signal }) => getTransactions(params, signal),
  });
}

interface InfiniteTransactionsInput extends TransactionsFilterParams {
  network: Network;
  limit?: number;
  order?: "asc" | "desc";
}

export function transactionsInfiniteQueryOptions(
  params: InfiniteTransactionsInput,
) {
  const limit = params.limit ?? 25;
  const order = params.order ?? "desc";
  return infiniteQueryOptions({
    queryKey: [
      "transactions-infinite",
      params.network,
      limit,
      order,
      params.transactionType ?? null,
      params.coinjoin ?? null,
      params.multisig ?? null,
      params.blockHeight ?? null,
    ],
    queryFn: ({ pageParam, signal }) =>
      getTransactions(
        {
          network: params.network,
          page: pageParam,
          limit,
          order,
          transactionType: params.transactionType,
          coinjoin: params.coinjoin,
          multisig: params.multisig,
          blockHeight: params.blockHeight,
        },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages, lastPageParam) => {
      const { page, limit: pageLimit, total } = lastPage.pagination;
      if (
        page !== lastPageParam ||
        pageLimit !== limit ||
        !Number.isSafeInteger(total) ||
        total < 0 ||
        lastPage.resultSet.length !== limit
      )
        return undefined;
      const previousHashes = new Set(
        pages
          .slice(0, -1)
          .flatMap((batch) =>
            batch.resultSet.map((transaction) => transaction.hash),
          ),
      );
      if (
        lastPage.resultSet.every((transaction) =>
          previousHashes.has(transaction.hash),
        )
      )
        return undefined;
      return page * pageLimit < total ? page + 1 : undefined;
    },
  });
}

interface FetchTransactionInput {
  network: Network;
  hash: string;
}

async function getTransaction(
  params: FetchTransactionInput,
  signal?: AbortSignal,
) {
  const url = new URL(
    `/transaction/${params.hash}`,
    getBaseUrl(params.network),
  );
  const response = await apiFetch(url, { signal });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiTransaction>;
}

export const fetchTransaction = createServerFn({ method: "POST" })
  .inputValidator((input: FetchTransactionInput) => input)
  .handler(({ data }) => getTransaction(data));

export function transactionQueryOptions(params: FetchTransactionInput) {
  return queryOptions({
    queryKey: ["transaction", params.network, params.hash],
    queryFn: ({ signal }) => getTransaction(params, signal),
  });
}

interface FetchTransactionsByHeightInput extends PaginationParams {
  network: Network;
  height: number;
}

async function getTransactionsByHeight(
  params: FetchTransactionsByHeightInput,
): Promise<PaginatedResponse<ApiTransaction>> {
  const emptyResult: PaginatedResponse<ApiTransaction> = {
    resultSet: [],
    pagination: { page: params.page ?? 1, limit: params.limit ?? 10, total: 0 },
  };
  try {
    const url = new URL(
      `/transactions/height/${params.height}`,
      getBaseUrl(params.network),
    );
    if (params.page !== undefined)
      url.searchParams.set("page", String(params.page));
    if (params.limit !== undefined)
      url.searchParams.set("limit", String(params.limit));
    if (params.order !== undefined) url.searchParams.set("order", params.order);

    const response = await apiFetch(url);
    if (!response.ok) return emptyResult;
    return response.json() as Promise<PaginatedResponse<ApiTransaction>>;
  } catch {
    return emptyResult;
  }
}

export const fetchTransactionsByHeight = createServerFn({ method: "POST" })
  .inputValidator((input: FetchTransactionsByHeightInput) => input)
  .handler(({ data }) => getTransactionsByHeight(data));

export function transactionsByHeightQueryOptions(
  params: FetchTransactionsByHeightInput,
) {
  return queryOptions({
    queryKey: [
      "transactionsByHeight",
      params.network,
      params.height,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getTransactionsByHeight(params),
  });
}
