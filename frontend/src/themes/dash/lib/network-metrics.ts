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
  const match = userAgent?.match(/^\/([^/:]+):([^/]+)\//);
  return {
    name: match?.[1] ?? (userAgent?.trim() || "Unknown"),
    version: match?.[2] ?? "Unknown",
  };
}

export function peerSlices(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const sorted = [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label, "en"),
    );
  const slices =
    sorted.length <= 4
      ? sorted
      : [
          ...sorted.slice(0, 3),
          {
            label: "Other",
            count: sorted
              .slice(3)
              .reduce((total, entry) => total + entry.count, 0),
          },
        ];
  let offset = 0;
  return slices.map((slice) => {
    const start = offset;
    const percent = (slice.count / values.length) * 100;
    offset += percent;
    return { ...slice, percent, start, end: offset };
  });
}
