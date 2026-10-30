import { describe, expect, it } from "vitest";
import type { ApiBlock } from "@/lib/api/types";
import { difficultyAxisLabel, estimatedSupply, historyChange, metricBytes, metricNumber, sortedHistory, upcomingBlocks } from "@/themes/dash/lib/home-metrics";

describe("Home metrics", () => {
  it("preserves non-zero difficulty ticks on testnet", () => {
    expect([0, 0.01, 0.015, 0.02].map(difficultyAxisLabel)).toEqual(["0", "0.01", "0.015", "0.02"]);
    expect(difficultyAxisLabel(0.000012)).toBe("1.2e-5");
    expect(difficultyAxisLabel(12500)).toBe("12\u00a0500");
  });
  it("preserves zero and formats grouping with non-breaking spaces", () => {
    expect(metricNumber(0)).toBe("0");
    expect(metricNumber(1580880)).toBe("1\u00a0580\u00a0880");
    expect(metricNumber(null)).toBe("—");
    expect(metricNumber(Number.NaN)).toBe("—");
    expect(metricNumber(Number.POSITIVE_INFINITY)).toBe("—");
    expect(metricNumber(0.00000012)).toBe("0.00000012");
  });

  it("uses byte units without relabeling transaction counts", () => {
    expect(metricBytes(0)).toBe("0 B");
    expect(metricBytes(1500)).toBe("1.5 kB");
    expect(metricBytes(2e9)).toBe("2 GB");
    expect(metricBytes(-1)).toBe("—");
    expect(metricBytes(null)).toBe("—");
  });

  it("sorts valid history without mutating cached data", () => {
    const history = [
      { timestamp: 1775088000, value: 20 },
      { timestamp: Number.NaN, value: 100 },
      { timestamp: 1775001600, value: 10 },
      { timestamp: 1775174400, value: Number.NaN },
    ];
    const sorted = sortedHistory(history);
    expect(sorted.map((entry) => entry.value)).toEqual([10, 20]);
    expect(history[0].value).toBe(20);
    expect(historyChange(sorted)).toBe(100);
    expect(historyChange([])).toBeNull();
    expect(historyChange([{ ...sorted[0], value: 0 }, sorted[1]])).toBeNull();
  });

  it("only estimates supply from finite prices and capitalization", () => {
    expect(estimatedSupply(100, 2)).toBe(50);
    expect(estimatedSupply(0, 2)).toBe(0);
    expect(estimatedSupply(100, 0)).toBeNull();
    expect(estimatedSupply(undefined, 2)).toBeNull();
    expect(estimatedSupply(Infinity, 2)).toBeNull();
  });

  it("estimates upcoming blocks using API milliseconds, not wall time", () => {
    const latest = { height: 100, timestamp: "2026-04-01T00:00:00Z" } as ApiBlock;
    expect(upcomingBlocks(latest, 150_000)).toEqual([
      { height: 101, expectedAt: Date.parse(latest.timestamp) + 150_000 },
      { height: 102, expectedAt: Date.parse(latest.timestamp) + 300_000 },
    ]);
    expect(upcomingBlocks(latest, null)).toEqual([]);
    expect(upcomingBlocks(latest, 0)).toEqual([]);
    expect(upcomingBlocks(undefined, 150_000)).toEqual([]);
    expect(upcomingBlocks({ ...latest, timestamp: "invalid" }, 150_000)).toEqual([]);
  });
});
