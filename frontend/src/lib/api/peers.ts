import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { PaginatedResponse, PaginationParams } from "./types";

export interface ApiPeerGeo {
  ipv4: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface ApiPeer {
  address: string;
  host: string;
  port: number;
  available: boolean;
  protocolVersion: number | null;
  services: number | null;
  userAgent: string | null;
  startHeight: number | null;
  lastSeen: string;
  probedAt: string;
  geo: ApiPeerGeo | null;
}

export interface PeerGeoPoint {
  address: string;
  available: boolean;
  userAgent: string | null;
  protocolVersion: number | null;
  ipv4: string;
  countryCode: string;
  city: string;
  lat: number;
  lng: number;
}

interface FetchPeersInput extends PaginationParams {
  network: Network;
}

async function getPeers(params: FetchPeersInput) {
  const url = new URL("/peers", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiPeer>>;
}

export const fetchPeers = createServerFn({ method: "POST" })
  .inputValidator((input: FetchPeersInput) => input)
  .handler(({ data }) => getPeers(data));

export function peersQueryOptions(params: FetchPeersInput) {
  return queryOptions({
    queryKey: [
      "peers",
      params.network,
      params.page,
      params.limit,
      params.order,
    ],
    queryFn: () => getPeers(params),
  });
}

interface FetchAllPeersInput {
  network: Network;
}

const ALL_PAGE_LIMIT = 100;
const ALL_MAX_PAGES = 200;

export function toGeoPoint(peer: ApiPeer): PeerGeoPoint | null {
  const geo = peer.geo;
  if (
    !geo ||
    typeof geo.latitude !== "number" ||
    typeof geo.longitude !== "number"
  )
    return null;
  return {
    address: peer.address,
    available: peer.available,
    userAgent: peer.userAgent,
    protocolVersion: peer.protocolVersion,
    ipv4: geo.ipv4,
    countryCode: geo.countryCode,
    city: geo.city,
    lat: geo.latitude,
    lng: geo.longitude,
  };
}

async function getAllPeers(params: FetchAllPeersInput): Promise<ApiPeer[]> {
  const first = await getPeers({
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
            getPeers({
              network: params.network,
              page: i + 2,
              limit: ALL_PAGE_LIMIT,
              order: "desc",
            }),
          ),
        )
      : [];
  const peers: ApiPeer[] = [];
  for (const response of [first, ...rest]) {
    for (const peer of response.resultSet) peers.push(peer);
  }
  return peers;
}

export const fetchAllPeers = createServerFn({ method: "POST" })
  .inputValidator((input: FetchAllPeersInput) => input)
  .handler(({ data }) => getAllPeers(data));

export function allPeersQueryOptions(params: FetchAllPeersInput) {
  return queryOptions({
    queryKey: ["peers-all", params.network],
    queryFn: () => getAllPeers(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function peersToGeoPoints(peers: ApiPeer[]): PeerGeoPoint[] {
  const points: PeerGeoPoint[] = [];
  for (const peer of peers) {
    const point = toGeoPoint(peer);
    if (point) points.push(point);
  }
  return points;
}
