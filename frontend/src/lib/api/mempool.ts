import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type {
  ApiTransaction,
  PaginatedResponse,
  PaginationParams,
} from "./types";

interface FetchMempoolInput extends PaginationParams {
  network: Network;
}

async function getMempool(params: FetchMempoolInput) {
  const url = new URL("/transactions/mempool", getBaseUrl(params.network));
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

export const fetchMempool = createServerFn({ method: "POST" })
  .inputValidator((input: FetchMempoolInput) => input)
  .handler(({ data }) => getMempool(data));

export function mempoolQueryOptions(params: FetchMempoolInput) {
  return queryOptions({
    queryKey: [
      "mempool",
      params.network,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getMempool(params),
  });
}
