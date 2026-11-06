import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { apiFetch, getBaseUrl } from "./client";
import { getSearch } from "./search";
import type {
  ApiBlock,
  ApiBlockReward,
  PaginatedResponse,
  PaginationParams,
} from "./types";

export function blockRewardQueryOptions(params: {
  network: Network;
  height: number | null | undefined;
}) {
  return queryOptions({
    queryKey: ["blockReward", params.network, params.height],
    enabled: params.height != null,
    queryFn: async ({ signal }): Promise<ApiBlockReward | null> => {
      if (params.height == null) return null;
      const url = new URL(
        `/blocks/${params.height}/reward`,
        getBaseUrl(params.network),
      );
      const response = await apiFetch(url, { signal });
      if (response.status === 404) return null;
      if (!response.ok)
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      return response.json();
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

interface FetchBlocksInput extends PaginationParams {
  network: Network;
  superblock?: boolean | null;
}

async function getBlocks(params: FetchBlocksInput, signal?: AbortSignal) {
  const url = new URL("/blocks", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);
  if (params.superblock != null)
    url.searchParams.set("superblock", String(params.superblock));

  const response = await apiFetch(url, { signal });
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
    queryFn: ({ signal }) => getBlocks(params, signal),
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
    queryFn: ({ pageParam, signal }) =>
      getBlocks(
        {
          network: params.network,
          page: pageParam,
          limit,
          order,
          superblock,
        },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, limit: pageLimit } = lastPage.pagination;
      return lastPage.resultSet.length === pageLimit ? page + 1 : undefined;
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
