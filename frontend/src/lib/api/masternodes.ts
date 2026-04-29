import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type {
  ApiMasternode,
  PaginatedResponse,
  PaginationParams,
  SearchResponse,
} from "./types";

interface FetchMasternodesInput extends PaginationParams {
  network: Network;
}

async function getMasternodes(params: FetchMasternodesInput) {
  const url = new URL("/masternodes", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiMasternode>>;
}

export const fetchMasternodes = createServerFn({ method: "POST" })
  .inputValidator((input: FetchMasternodesInput) => input)
  .handler(({ data }) => getMasternodes(data));

interface FetchMasternodeInput {
  network: Network;
  hash: string;
}

async function getMasternode(params: FetchMasternodeInput) {
  const url = new URL("/search", getBaseUrl(params.network));
  url.searchParams.set("query", params.hash);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const json = (await response.json()) as SearchResponse;
  return json.masternode;
}

export const fetchMasternode = createServerFn({ method: "POST" })
  .inputValidator((input: FetchMasternodeInput) => input)
  .handler(({ data }) => getMasternode(data));

export function masternodeQueryOptions(params: FetchMasternodeInput) {
  return queryOptions({
    queryKey: ["masternode", params.network, params.hash],
    queryFn: () => getMasternode(params),
  });
}

export function masternodesQueryOptions(params: FetchMasternodesInput) {
  return queryOptions({
    queryKey: [
      "masternodes",
      params.network,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getMasternodes(params),
  });
}
