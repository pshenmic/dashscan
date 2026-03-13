import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { ApiTransactionHistoryEntry } from "./types";

interface FetchTransactionHistoryInput {
  network: Network;
}

async function getTransactionHistory(params: FetchTransactionHistoryInput) {
  const url = new URL("/transactions/history", getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiTransactionHistoryEntry[]>;
}

export const fetchTransactionHistory = createServerFn({ method: "POST" })
  .inputValidator((input: FetchTransactionHistoryInput) => input)
  .handler(({ data }) => getTransactionHistory(data));

export function transactionHistoryQueryOptions(
  params: FetchTransactionHistoryInput,
) {
  return queryOptions({
    queryKey: ["transactionHistory", params.network],
    queryFn: () => getTransactionHistory(params),
  });
}
