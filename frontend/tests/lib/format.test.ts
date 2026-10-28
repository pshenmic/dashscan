import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCompact, formatDateTime, formatNumber, formatRelativeTime } from "@/lib/format";

describe("formatNumber", () => {
  it("groups thousands with non-breaking spaces and keeps a decimal point", () => {
    expect(formatNumber(1580880)).toBe("1\u00a0580\u00a0880");
    expect(formatNumber(-12345.67)).toBe("-12\u00a0345.67");
  });

  it("preserves requested precision without changing grouping", () => {
    expect(formatNumber(1234.56789, { maximumFractionDigits: 4 })).toBe("1\u00a0234.5679");
    expect(formatNumber(1234, { minimumFractionDigits: 2 })).toBe("1\u00a0234.00");
  });

  it("supports zero, ungrouped numbers and exact bigint values", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(9007199254740993n)).toBe("9\u00a0007\u00a0199\u00a0254\u00a0740\u00a0993");
    expect(formatNumber(1234, { useGrouping: false })).toBe("1234");
  });

  it("retains compact suffixes with locale-independent fractional values", () => {
    expect(formatCompact(12.5)).toBe("12.5");
    expect(formatCompact(1500)).toBe("1.5K");
  });
});

describe("formatDateTime", () => {
  it("uses a fixed locale and explicitly labelled UTC time", () => {
    expect(formatDateTime("2025-01-15T12:34:56Z")).toBe("Jan 15, 2025, 12:34:56 PM UTC");
    expect(formatDateTime("2025-01-15T15:34:56+03:00")).toBe("Jan 15, 2025, 12:34:56 PM UTC");
  });

  it("keeps chart dates in UTC across a local date boundary", () => {
    expect(formatDateTime("2025-01-01T00:30:00+03:00", {
      year: "numeric", month: "short", day: "numeric",
    })).toBe("Dec 31, 2024");
  });

  it("accepts Date objects and timestamps, and handles invalid dates", () => {
    const date = new Date("2025-01-15T12:34:56Z");
    expect(formatDateTime(date)).toBe(formatDateTime(date.getTime()));
    expect(formatDateTime("invalid")).toBe("—");
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2025-01-15T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns seconds for timestamps less than 60s ago", () => {
    const timestamp = new Date(NOW - 30 * 1000).toISOString();
    expect(formatRelativeTime(timestamp)).toBe("30 sec. ago");
  });

  it("returns 0 sec. ago for the current timestamp", () => {
    const timestamp = new Date(NOW).toISOString();
    expect(formatRelativeTime(timestamp)).toBe("0 sec. ago");
  });

  it("returns minutes for timestamps less than 60min ago", () => {
    const timestamp = new Date(NOW - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(timestamp)).toBe("5 min. ago");
  });

  it("returns hours for timestamps less than 24h ago", () => {
    const timestamp = new Date(NOW - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(timestamp)).toBe("3 hr. ago");
  });

  it("returns singular day for exactly 1 day ago", () => {
    const timestamp = new Date(NOW - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(timestamp)).toBe("1 day ago");
  });

  it("returns plural days for more than 1 day ago", () => {
    const timestamp = new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(timestamp)).toBe("5 days ago");
  });

  it("returns minutes at the 60-second boundary", () => {
    const timestamp = new Date(NOW - 60 * 1000).toISOString();
    expect(formatRelativeTime(timestamp)).toBe("1 min. ago");
  });

  it("returns hours at the 60-minute boundary", () => {
    const timestamp = new Date(NOW - 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(timestamp)).toBe("1 hr. ago");
  });
});
