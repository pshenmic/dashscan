import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type {
  ApiMasternode,
  ApiProposalVote,
  PaginatedResponse,
  PaginationParams,
  SearchResponse,
} from "./types";

export interface MasternodeGeoPoint {
  proTxHash: string;
  status: string;
  type: string;
  address: string;
  ipv4: string;
  countryCode: string;
  city: string;
  lat: number;
  lng: number;
}

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

async function getMasternodeVotes(params: FetchMasternodeInput) {
  const url = new URL(
    `/masternode/${params.hash}/votes`,
    getBaseUrl(params.network),
  );
  const response = await fetch(url);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiProposalVote[]>;
}

export function masternodeVotesQueryOptions(params: FetchMasternodeInput) {
  return queryOptions({
    queryKey: ["masternode-votes", params.network, params.hash],
    queryFn: () => getMasternodeVotes(params),
    staleTime: 60 * 1000,
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

interface InfiniteMasternodesInput {
  network: Network;
  limit?: number;
  order?: "asc" | "desc";
}

export function masternodesInfiniteQueryOptions(
  params: InfiniteMasternodesInput,
) {
  const limit = params.limit ?? 25;
  const order = params.order ?? "desc";
  return infiniteQueryOptions({
    queryKey: ["masternodes-infinite", params.network, limit, order],
    queryFn: ({ pageParam }) =>
      getMasternodes({
        network: params.network,
        page: pageParam,
        limit,
        order,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, limit: pageLimit, total } = lastPage.pagination;
      return page * pageLimit < total ? page + 1 : undefined;
    },
  });
}

interface FetchAllMasternodesInput {
  network: Network;
}

const ALL_PAGE_LIMIT = 100;
const ALL_MAX_PAGES = 200;

function toGeoPoint(mn: ApiMasternode): MasternodeGeoPoint | null {
  const geo = mn.geoIpInfo;
  if (
    !geo ||
    typeof geo.latitude !== "number" ||
    typeof geo.longitude !== "number"
  )
    return null;
  return {
    proTxHash: mn.proTxHash,
    status: mn.status,
    type: mn.type,
    address: mn.address,
    ipv4: geo.ipv4,
    countryCode: geo.countryCode,
    city: geo.city,
    lat: geo.latitude,
    lng: geo.longitude,
  };
}

async function getAllMasternodes(
  params: FetchAllMasternodesInput,
): Promise<ApiMasternode[]> {
  const first = await getMasternodes({
    network: params.network,
    page: 1,
    limit: ALL_PAGE_LIMIT,
    order: "desc",
  });
  const pageCount = Math.min(
    ALL_MAX_PAGES,
    Math.max(1, Math.ceil(first.pagination.total / ALL_PAGE_LIMIT)),
  );
  const rest =
    pageCount > 1
      ? await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, i) =>
            getMasternodes({
              network: params.network,
              page: i + 2,
              limit: ALL_PAGE_LIMIT,
              order: "desc",
            }),
          ),
        )
      : [];
  const masternodes: ApiMasternode[] = [];
  for (const response of [first, ...rest]) {
    for (const mn of response.resultSet) masternodes.push(mn);
  }
  return masternodes;
}

export const fetchAllMasternodes = createServerFn({ method: "POST" })
  .inputValidator((input: FetchAllMasternodesInput) => input)
  .handler(({ data }) => getAllMasternodes(data));

export function allMasternodesQueryOptions(params: FetchAllMasternodesInput) {
  return queryOptions({
    queryKey: ["masternodes-all", params.network],
    queryFn: () => getAllMasternodes(params),
    staleTime: 5 * 60 * 1000,
  });
}

async function getAllMasternodesGeo(
  params: FetchAllMasternodesInput,
): Promise<MasternodeGeoPoint[]> {
  const masternodes = await getAllMasternodes(params);
  const points: MasternodeGeoPoint[] = [];
  for (const mn of masternodes) {
    const point = toGeoPoint(mn);
    if (point) points.push(point);
  }
  return points;
}

export const fetchAllMasternodesGeo = createServerFn({ method: "POST" })
  .inputValidator((input: FetchAllMasternodesInput) => input)
  .handler(({ data }) => getAllMasternodesGeo(data));

export function allMasternodesGeoQueryOptions(
  params: FetchAllMasternodesInput,
) {
  return queryOptions({
    queryKey: ["masternodes-geo-all", params.network],
    queryFn: () => getAllMasternodesGeo(params),
    staleTime: 5 * 60 * 1000,
  });
}
