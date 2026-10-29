import { describe, expect, it } from "vitest";
import { addressDistribution } from "@/themes/dash/lib/address-metrics";

const entry = (address: string, balance: string | null) => ({
  address,
  balance,
  concentration: null,
});

describe("Home address distribution", () => {
  it("groups the top ten and includes the remaining supply", () => {
    const entries = Array.from({ length: 10 }, (_, index) =>
      entry(`address-${index}`, "10"),
    );
    expect(addressDistribution([...entries, entry("others", "100")])).toEqual({
      total: "200",
      shares: [5, 20, 25, 50],
      topTen: 50,
    });
  });

  it("preserves totals beyond safe integer precision", () => {
    expect(addressDistribution([
      entry("first", "9007199254740993"),
      entry("others", "9007199254740993"),
    ])).toEqual({
      total: "18014398509481986",
      shares: [50, 0, 0, 50],
      topTen: 50,
    });
  });

  it("does not invent a distribution for missing or invalid balances", () => {
    expect(addressDistribution(undefined)).toBeNull();
    expect(addressDistribution([])).toBeNull();
    expect(addressDistribution([entry("first", "10")])).toBeNull();
    for (const balance of [null, "", "-1", "1.5", "NaN"]) {
      expect(addressDistribution([entry("others", balance)])).toBeNull();
    }
  });

  it("distinguishes zero supply from missing supply", () => {
    expect(addressDistribution([entry("others", "0")])).toEqual({
      total: "0",
      shares: null,
      topTen: null,
    });
  });
});
