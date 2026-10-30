import { describe, expect, it } from "vitest";
import type { ApiPeer } from "@/lib/api/peers";
import { peerClient, peerCountries, peerLocation, peerSlices } from "@/themes/dash/lib/network-metrics";

describe("Network metrics", () => {
  it("parses reported clients without guessing unknown software", () => {
    expect(peerClient("/Dash Core:24.0.0/")).toEqual({ name: "Dash Core", version: "24.0.0" });
    expect(peerClient("custom-client")).toEqual({ name: "custom-client", version: "Unknown" });
    expect(peerClient(null)).toEqual({ name: "Unknown", version: "Unknown" });
  });
  it("keeps all peers in chart denominators and groups the tail", () => {
    const slices = peerSlices(["A", "A", "B", "C", "D", "Unknown"]);
    expect(slices.map(({label, count}) => [label, count])).toEqual([["A", 2], ["B", 1], ["C", 1], ["Other", 2]]);
    expect(slices.at(-1)?.end).toBeCloseTo(100);
    expect(peerSlices([])).toEqual([]);
    expect(peerSlices(["Unknown"])[0].percent).toBe(100);
  });
  it("validates geographic coordinates and includes unknown countries", () => {
    const peer = { geo: { countryCode: " us ", latitude: 0, longitude: 0 } } as ApiPeer;
    expect(peerLocation(peer)).toEqual({lat: 0, lng: 0});
    expect(peerLocation({...peer, geo: {...peer.geo!, latitude: 91}})).toBeUndefined();
    expect(peerLocation({...peer, geo: {...peer.geo!, longitude: Number.NaN}})).toBeUndefined();
    expect(peerCountries([peer, {geo: null} as ApiPeer]).map(group => [group.name, group.nodes.length])).toEqual([["Unknown", 1], ["United States", 1]]);
  });
});
