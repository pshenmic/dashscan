import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { apiFetch, getBaseUrl } from "./client";
import { getSearch } from "./search";
import type { ApiBlock, PaginatedResponse, PaginationParams } from "./types";

interface FetchBlocksInput extends PaginationParams {
  network: Network;
  superblock?: boolean | null;
}

async function getBlocks(params: FetchBlocksInput) {
  const url = new URL("/blocks", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);
  if (params.superblock != null)
    url.searchParams.set("superblock", String(params.superblock));

  const response = await apiFetch(url);
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
      params.superblock ?? null,
    ],
    queryFn: () => getBlocks(params),
  });
}

interface InfiniteBlocksInput {
  network: Network;
  limit?: number;
  order?: "asc" | "desc";
  superblock?: boolean | null;
}

export function blocksInfiniteQueryOptions(params: InfiniteBlocksInput) {
  const limit = params.limit ?? 25;
  const order = params.order ?? "desc";
  const superblock = params.superblock ?? null;
  return infiniteQueryOptions({
    queryKey: ["blocks-infinite", params.network, limit, order, superblock],
    queryFn: ({ pageParam }) =>
      getBlocks({
        network: params.network,
        page: pageParam,
        limit,
        order,
        superblock,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, limit: pageLimit, total } = lastPage.pagination;
      return page * pageLimit < total ? page + 1 : undefined;
    },
  });
}

interface FetchBlockInput {
  network: Network;
  hash: string;
}

class BlockNotFoundError extends Error {
  constructor() {
    super("Block not found");
  }
}

async function getBlock(params: FetchBlockInput, signal?: AbortSignal) {
  let hash = params.hash;
  if (/^\d{1,16}$/.test(hash)) {
    const result = await getSearch(
      { network: params.network, query: hash },
      signal,
    );
    if (!result.block) throw new BlockNotFoundError();
    hash = result.block.hash;
  }
  const url = new URL(`/block/${hash}`, getBaseUrl(params.network));
  const response = await apiFetch(url, { signal });
  if (response.status === 404) throw new BlockNotFoundError();
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
    queryFn: ({ signal }) => getBlock(params, signal),
  });
}

export function blockLookupQueryOptions(params: {
  network: Network;
  value: string;
}) {
  return queryOptions({
    queryKey: ["block-lookup", params.network, params.value],
    queryFn: async ({ signal }) => {
      try {
        return await getBlock(
          { network: params.network, hash: params.value },
          signal,
        );
      } catch (error) {
        if (error instanceof BlockNotFoundError) return null;
        throw error;
      }
    },
  });
}
