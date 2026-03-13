import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type {
  ApiMasternode,
  PaginatedResponse,
  PaginationParams,
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
