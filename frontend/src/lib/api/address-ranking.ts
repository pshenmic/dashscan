import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { Network } from "@/lib/store";
import { getAddressesInfo, getRichList } from "./addresses";

export interface AddressRankingEntry {
  address: string | null;
  txCount?: number | null;
  balance?: string | null;
  concentration?: string | null;
}

interface RankingInput {
  network: Network;
  limit: number;
  order: "asc" | "desc";
}

async function getRanking(
  params: RankingInput,
  page: number,
  signal: AbortSignal,
) {
  const batches = params.limit === 100 ? 2 : 1;
  const batchSize = params.limit / batches;
  const responses = await Promise.all(
    Array.from({ length: batches }, (_, index) =>
      getRichList(
        {
          ...params,
          limit: batchSize + 1,
          page: (page - 1) * batches + index + 1,
        },
        signal,
      ),
    ),
  );
  const entries = responses.flatMap((response) =>
    response.resultSet.filter(
      (entry) => entry.address && entry.address !== "others",
    ),
  );
  const addresses = entries.flatMap((entry) =>
    entry.address ? [entry.address] : [],
  );
  const info = addresses.length
    ? await getAddressesInfo({ network: params.network, addresses }, signal)
    : [];
  const byAddress = new Map(info.map((entry) => [entry.address, entry]));
  return {
    pagination: { ...responses[0].pagination, page, limit: params.limit },
    resultSet: entries.map(
      (entry): AddressRankingEntry => ({
        ...entry,
        txCount: byAddress.get(entry.address)?.txCount,
      }),
    ),
  };
}

export function addressRankingQueryOptions(params: RankingInput, page: number) {
  return queryOptions({
    queryKey: ["address-balance-ranking", params, page],
    queryFn: ({ signal }) => getRanking(params, page, signal),
    staleTime: 60_000,
  });
}

export function addressRankingInfiniteQueryOptions(params: RankingInput) {
  return infiniteQueryOptions({
    queryKey: ["address-balance-ranking-infinite", params],
    queryFn: ({ pageParam, signal }) => getRanking(params, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage &&
      lastPage.resultSet.length > 0 &&
      lastPage.pagination.page * params.limit < lastPage.pagination.total
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 60_000,
  });
}
