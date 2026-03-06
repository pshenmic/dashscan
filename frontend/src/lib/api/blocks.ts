import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { ApiBlock, PaginatedResponse, PaginationParams } from "./types";

interface FetchBlocksInput extends PaginationParams {
  network: Network;
}

async function getBlocks(params: FetchBlocksInput) {
  const url = new URL("/blocks", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiBlock>>;
}

export const fetchBlocks = createServerFn({ method: "POST" })
  .inputValidator((input: FetchBlocksInput) => input)
  .handler(({ data }) => getBlocks(data));

export function blocksQueryOptions(params: FetchBlocksInput) {
  return queryOptions({
    queryKey: [
      "blocks",
      params.network,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getBlocks(params),
  });
}

interface FetchBlockInput {
  network: Network;
  hash: string;
}

async function getBlock(params: FetchBlockInput) {
  const url = new URL(`/block/${params.hash}`, getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiBlock>;
}

export const fetchBlock = createServerFn({ method: "POST" })
  .inputValidator((input: FetchBlockInput) => input)
  .handler(({ data }) => getBlock(data));

export function blockQueryOptions(params: FetchBlockInput) {
  return queryOptions({
    queryKey: ["block", params.network, params.hash],
    queryFn: () => getBlock(params),
  });
}
