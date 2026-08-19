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

export interface ApiPeerUserAgent {
  userAgent: string;
  count: number;
}

export function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every(
      (part) =>
        /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255,
    )
  );
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
  available?: boolean;
  country?: string;
  userAgent?: string;
  ip?: string;
}

async function getPeers(params: FetchPeersInput) {
  const url = new URL("/peers", getBaseUrl(params.network));
  if (params.page !== undefined)
    url.searchParams.set("page", String(params.page));
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params.order !== undefined) url.searchParams.set("order", params.order);
  if (params.available !== undefined)
    url.searchParams.set("available", String(params.available));
  if (params.country) url.searchParams.set("country", params.country);
  if (params.userAgent) url.searchParams.set("user_agent", params.userAgent);
  if (params.ip) url.searchParams.set("ip", params.ip);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<PaginatedResponse<ApiPeer>>;
}

interface FetchAllPeersInput {
  network: Network;
}

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

const SERVICE_FLAG_NAMES = new Map<number, string>([
  [0, "NETWORK"],
  [1, "GETUTXO"],
  [2, "BLOOM"],
  [4, "XTHIN"],
  [6, "COMPACT_FILTERS"],
  [10, "NETWORK_LIMITED"],
]);

export function decodeServices(services: number | null): {
  names: string[];
  unknownBits: number[];
} {
  const names: string[] = [];
  const unknownBits: number[] = [];
  if (services == null || services <= 0) return { names, unknownBits };
  for (let bit = 0; bit < 32; bit++) {
    if (!(services & (1 << bit))) continue;
    const name = SERVICE_FLAG_NAMES.get(bit);
    if (name) names.push(name);
    else unknownBits.push(bit);
  }
  return { names, unknownBits };
}

async function getAllPeers(params: FetchAllPeersInput): Promise<ApiPeer[]> {
  const response = await getPeers({
    network: params.network,
    order: "desc",
  });
  return response.resultSet;
}

async function getPeerUserAgents(
  params: FetchAllPeersInput,
): Promise<ApiPeerUserAgent[] | null> {
  const url = new URL("/peers/user-agents", getBaseUrl(params.network));
  url.searchParams.set("order", "desc");
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as PaginatedResponse<ApiPeerUserAgent>;
  return data.resultSet;
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

export function peerUserAgentsQueryOptions(params: FetchAllPeersInput) {
  return queryOptions({
    queryKey: ["peer-user-agents", params.network],
    queryFn: () => getPeerUserAgents(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function derivePeerUserAgents(peers: ApiPeer[]): ApiPeerUserAgent[] {
  const counts = new Map<string, number>();
  for (const peer of peers) {
    if (!peer.available || !peer.userAgent) continue;
    counts.set(peer.userAgent, (counts.get(peer.userAgent) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([userAgent, count]) => ({ userAgent, count }))
    .sort(
      (a, b) => b.count - a.count || a.userAgent.localeCompare(b.userAgent),
    );
}

export function peersByAddress(peers: ApiPeer[]): Map<string, ApiPeer> {
  return new Map(peers.map((peer) => [peer.address, peer]));
}

export function peersToGeoPoints(peers: ApiPeer[]): PeerGeoPoint[] {
  const points: PeerGeoPoint[] = [];
  for (const peer of peers) {
    const point = toGeoPoint(peer);
    if (point) points.push(point);
  }
  return points;
}
