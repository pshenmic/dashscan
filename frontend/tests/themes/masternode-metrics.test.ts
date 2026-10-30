import { describe, expect, it } from "vitest";
import type { ApiMasternode } from "@/lib/api/types";
import { masternodeCountries, masternodeCountry, masternodeDistribution } from "@/themes/dash/lib/masternode-metrics";

const node = (type: string, latitude?: number, longitude?: number) => ({ type, geoIpInfo: latitude === undefined ? null : { latitude, longitude } }) as ApiMasternode;

describe("Home masternode distribution", () => {
  it("groups countries without discarding nodes missing coordinates", () => {
    const regular = { ...node("Regular"), geoIpInfo: { countryCode: " us " } } as ApiMasternode;
    const evo = { ...node("Evo"), geoIpInfo: { countryCode: "US" } } as ApiMasternode;
    const groups = masternodeCountries([regular, evo, node("Regular")]);
    expect(groups.map(group => [group.code, group.nodes.length])).toEqual([["US", 2], ["unknown", 1]]);
    expect(groups[0].distribution).toMatchObject({ regular: 1, evo: 1, located: 0 });
    expect(groups.flatMap(group => group.nodes)).toHaveLength(3);
    expect(masternodeCountries(undefined)).toEqual([]);
  });
  it("keeps invalid and unknown country codes out of geographic groups", () => {
    for (const countryCode of ["", "ZZ", "USA", "12", "!!"]) {
      expect(masternodeCountry({ ...node("Regular"), geoIpInfo: { countryCode } } as ApiMasternode)).toBe("unknown");
    }
  });
  it("distinguishes missing data from an empty network", () => {
    expect(masternodeDistribution(undefined)).toBeNull();
    expect(masternodeDistribution([])).toEqual({ total: 0, regular: 0, evo: 0, located: 0, locations: [] });
  });
  it("counts known types without classifying unknown nodes as regular", () => {
    expect(masternodeDistribution([node("Regular"), node("Evo"), node("unknown")])).toMatchObject({ total: 3, regular: 1, evo: 1 });
  });
  it("groups shared coordinates and excludes missing or invalid locations", () => {
    expect(masternodeDistribution([node("Regular", 0, 0), node("Evo", 0, 0), node("Regular", 91, 0), node("Regular", 10, Number.NaN), node("Regular"), node("Evo", 0, 181)])).toMatchObject({ total: 6, located: 2, locations: [{ lat: 0, lng: 0, count: 2 }] });
  });
});
