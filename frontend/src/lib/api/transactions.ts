import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type {
  ApiTransaction,
  PaginatedResponse,
  PaginationParams,
} from "./types";

interface FetchTransactionsInput extends PaginationParams {
  network: Network;
}

async function getTransactions(params: FetchTransactionsInput) {
  const url = new URL("/transactions", getBaseUrl(params.network));
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
    ],
    queryFn: () => getTransactions(params),
  });
}

interface FetchTransactionInput {
  network: Network;
  hash: string;
}

async function getTransaction(params: FetchTransactionInput) {
  const url = new URL(
    `/transaction/${params.hash}`,
    getBaseUrl(params.network),
  );
  const response = await fetch(url);
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
    queryFn: () => getTransaction(params),
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

    const response = await fetch(url);
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
