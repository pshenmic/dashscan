import { describe, expect, it } from "vitest";
import { transactionAmount, transactionHistoryRange, transactionHistorySummary } from "@/themes/dash/lib/transaction-metrics";

describe("Home transaction metrics", () => {
  it("formats duffs precisely without inventing missing amounts", () => {
    expect(transactionAmount("0")).toBe("0 Dash");
    expect(transactionAmount("1")).toBe("0.00000001 Dash");
    expect(transactionAmount("18700000")).toBe("0.187 Dash");
    expect(transactionAmount("123456789012345678")).toBe("1\u00a0234\u00a0567\u00a0890.12345678 Dash");
    expect(transactionAmount(null)).toBe("—");
    expect(transactionAmount("")).toBe("—");
    expect(transactionAmount("-1")).toBe("—");
    expect(transactionAmount("NaN")).toBe("—");
  });

  it("uses complete UTC days and a stable 60-day query range", () => {
    const first = transactionHistoryRange(Date.parse("2026-06-01T00:01:00Z"));
    const later = transactionHistoryRange(Date.parse("2026-06-01T23:59:00Z"));
    expect(first).toEqual(later);
    expect(first.timestampEnd).toBe("2026-06-01T00:00:00.000Z");
    expect(Date.parse(first.timestampEnd) - Date.parse(first.timestampStart)).toBe(60 * 86400000);
    expect(first.intervalsCount).toBe(60);
  });

  it("compares two distinct periods and excludes invalid or outside buckets", () => {
    const entries = [
      { timestamp: "2026-05-10T00:00:00Z", data: { count: 30 } },
      { timestamp: "2026-04-10T00:00:00Z", data: { count: 10 } },
      { timestamp: "2026-06-01T00:00:00Z", data: { count: 900 } },
      { timestamp: "bad", data: { count: 100 } },
      { timestamp: "2026-05-11T00:00:00Z", data: { count: -1 } },
    ];
    const summary = transactionHistorySummary(entries, "2026-06-01T00:00:00Z");
    expect(summary.currentTotal).toBe(30);
    expect(summary.previousTotal).toBe(10);
    expect(summary.change).toBe(200);
    expect(entries[0].data.count).toBe(30);
  });

  it("distinguishes zero activity from missing history", () => {
    expect(transactionHistorySummary(undefined, "2026-06-01T00:00:00Z").currentTotal).toBeNull();
    const summary = transactionHistorySummary([
      { timestamp: "2026-05-10T00:00:00Z", data: { count: 0 } },
      { timestamp: "2026-04-10T00:00:00Z", data: { count: 0 } },
    ], "2026-06-01T00:00:00Z");
    expect(summary.currentTotal).toBe(0);
    expect(summary.change).toBeNull();
  });
});
