import type { ApiMasternode } from "@/lib/api/types";

const countryNames = new Intl.DisplayNames("en", {
  type: "region",
  fallback: "none",
});

export function masternodeCountry(node: ApiMasternode) {
  const code = node.geoIpInfo?.countryCode?.trim().toUpperCase();
  return code &&
    /^[A-Z]{2}$/.test(code) &&
    code !== "ZZ" &&
    countryNames.of(code)
    ? code
    : "unknown";
}

export function masternodeCountries(nodes: ApiMasternode[] | undefined) {
  const groups = new Map<string, ApiMasternode[]>();
  for (const node of nodes ?? []) {
    const code = masternodeCountry(node);
    const group = groups.get(code);
    if (group) group.push(node);
    else groups.set(code, [node]);
  }
  return [...groups]
    .map(([code, members]) => ({
      code,
      name:
        code === "unknown"
          ? "Unknown location"
          : (countryNames.of(code) ?? code),
      nodes: members,
      distribution: masternodeDistribution(members),
    }))
    .sort(
      (left, right) =>
        right.nodes.length - left.nodes.length ||
        left.code.localeCompare(right.code, "en"),
    );
}

export function masternodeDistribution(nodes: ApiMasternode[] | undefined) {
  if (!nodes) return null;
  const locations = new Map<
    string,
    { lat: number; lng: number; count: number }
  >();
  let regular = 0;
  let evo = 0;
  let located = 0;
  for (const node of nodes) {
    const type = node.type.toLowerCase();
    if (type === "regular") regular += 1;
    if (["evo", "evolution", "highperformance"].includes(type)) evo += 1;
    const lat = node.geoIpInfo?.latitude;
    const lng = node.geoIpInfo?.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      continue;
    located += 1;
    const key = `${lat},${lng}`;
    const location = locations.get(key);
    if (location) location.count += 1;
    else locations.set(key, { lat, lng, count: 1 });
  }
  return {
    total: nodes.length,
    regular,
    evo,
    located,
    locations: [...locations.values()],
  };
}
