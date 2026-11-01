import type { ApiPeer } from "@/lib/api/peers";

const countryNames = new Intl.DisplayNames("en", {
  type: "region",
  fallback: "none",
});

export function peerLocation(peer: ApiPeer) {
  const lat = peer.geo?.latitude;
  const lng = peer.geo?.longitude;
  return typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
    ? { lat, lng }
    : undefined;
}

export function peerCountries(peers: ApiPeer[]) {
  const groups = new Map<string, ApiPeer[]>();
  for (const peer of peers) {
    const raw = peer.geo?.countryCode.trim().toUpperCase();
    const code =
      raw && /^[A-Z]{2}$/.test(raw) && raw !== "ZZ" && countryNames.of(raw)
        ? raw
        : "unknown";
    const group = groups.get(code);
    if (group) group.push(peer);
    else groups.set(code, [peer]);
  }
  return [...groups]
    .map(([code, nodes]) => ({
      code,
      name: code === "unknown" ? "Unknown" : (countryNames.of(code) ?? code),
      nodes,
    }))
    .sort(
      (left, right) =>
        right.nodes.length - left.nodes.length ||
        left.code.localeCompare(right.code, "en"),
    );
}

export function peerClient(userAgent: string | null) {
  const match = userAgent
    ?.trim()
    .match(/^\/([^/:]+):([^/()\s]+)(?:\([^/]*\))?\//);
  return {
    name: match?.[1] ?? (userAgent?.trim() || "Unknown"),
    version: match?.[2] ?? "Unknown",
  };
}

export type PeerFacet = "country" | "client" | "version";
export type PeerSelection = { facet: PeerFacet; value: string | null };
export type PeerEntry = { id: string; value: string; label: string };
export type PeerGroup = { value: string; label: string; ids: string[] };
export type PeerSlice = {
  value: string | null;
  label: string;
  ids: string[];
  groups: PeerGroup[];
  count: number;
  percent: number;
};

export function peerDistribution(entries: PeerEntry[]): PeerSlice[] {
  const groups = new Map<string, PeerGroup>();
  for (const entry of entries) {
    const group = groups.get(entry.value);
    if (group) group.ids.push(entry.id);
    else
      groups.set(entry.value, {
        value: entry.value,
        label: entry.label,
        ids: [entry.id],
      });
  }
  const sorted = [...groups.values()].sort(
    (left, right) =>
      right.ids.length - left.ids.length ||
      left.label.localeCompare(right.label, "en"),
  );
  const partitions =
    sorted.length <= 4
      ? sorted.map((group) => [group])
      : [...sorted.slice(0, 3).map((group) => [group]), sorted.slice(3)];
  return partitions.map((members) => {
    const ids = members.flatMap((group) => group.ids);
    return {
      value: members.length === 1 ? members[0].value : null,
      label: members.length === 1 ? members[0].label : "Other",
      ids,
      groups: members,
      count: ids.length,
      percent: (ids.length / entries.length) * 100,
    };
  });
}

export function peerNetworkData(peers: ApiPeer[]) {
  const nodes = peers.filter((peer) => peer.available);
  const countryGroups = peerCountries(nodes);
  const clients = nodes.map((peer) => ({
    id: peer.address,
    ...peerClient(peer.userAgent),
  }));
  const entries: Record<PeerFacet, PeerEntry[]> = {
    country: countryGroups.flatMap((country) =>
      country.nodes.map((peer) => ({
        id: peer.address,
        value: country.code,
        label: country.name,
      })),
    ),
    client: clients.map((client) => ({
      id: client.id,
      value: client.name,
      label: client.name,
    })),
    version: clients
      .filter((client) => client.name === "Dash Core")
      .map((client) => ({
        id: client.id,
        value: client.version,
        label: client.version,
      })),
  };
  return {
    nodes,
    located: nodes.filter(peerLocation).length,
    countryGroups,
    entries,
    distributions: {
      country: peerDistribution(entries.country),
      client: peerDistribution(entries.client),
      version: peerDistribution(entries.version),
    },
  };
}

export function selectedPeerIds(
  data: ReturnType<typeof peerNetworkData>,
  selection: PeerSelection | null,
): Set<string> | null {
  if (!selection) return null;
  const entries = data.entries[selection.facet];
  return new Set(
    selection.value === null
      ? (data.distributions[selection.facet].find(
          (slice) => slice.value === null,
        )?.ids ?? [])
      : entries
          .filter((entry) => entry.value === selection.value)
          .map((entry) => entry.id),
  );
}
