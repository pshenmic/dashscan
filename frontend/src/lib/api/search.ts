import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { apiFetch, getBaseUrl } from "./client";
import type { SearchResponse } from "./types";

interface FetchSearchInput {
  network: Network;
  query: string;
}

export async function getSearch(
  params: FetchSearchInput,
  signal?: AbortSignal,
) {
  const url = new URL("/search", getBaseUrl(params.network));
  url.searchParams.set("query", params.query);

  const response = await apiFetch(url, { signal });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<SearchResponse>;
}

export const fetchSearch = createServerFn({ method: "POST" })
  .inputValidator((input: FetchSearchInput) => input)
  .handler(({ data }) => getSearch(data));

export function searchQueryOptions(params: FetchSearchInput) {
  return queryOptions({
    queryKey: ["search", params.network, params.query],
    queryFn: ({ signal }) => getSearch(params, signal),
    enabled: params.query.length > 0,
  });
}
