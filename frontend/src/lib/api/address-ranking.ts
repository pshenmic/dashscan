import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { Network } from "@/lib/store";
import { getAddresses, getAddressesInfo } from "./addresses";

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
  const result = await getAddresses({ ...params, page }, signal);
  const addresses = result.resultSet.flatMap((entry) =>
    entry.address ? [entry.address] : [],
  );
  const info = addresses.length
    ? await getAddressesInfo({ network: params.network, addresses }, signal)
    : [];
  const byAddress = new Map(info.map((entry) => [entry.address, entry]));
  return {
    ...result,
    resultSet: result.resultSet.map(
      (entry): AddressRankingEntry => ({
        address: entry.address,
        balance: byAddress.get(entry.address)?.balance,
        txCount: byAddress.get(entry.address)?.txCount,
      }),
    ),
  };
}

export function addressRankingQueryOptions(params: RankingInput, page: number) {
  return queryOptions({
    queryKey: ["address-list", params, page],
    queryFn: ({ signal }) => getRanking(params, page, signal),
    staleTime: 60_000,
  });
}

export function addressRankingInfiniteQueryOptions(params: RankingInput) {
  return infiniteQueryOptions({
    queryKey: ["address-list-infinite", params],
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
