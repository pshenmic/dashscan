import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { ApiAddress, PaginatedResponse, PaginationParams } from "./types";

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
