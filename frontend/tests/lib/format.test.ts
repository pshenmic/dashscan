import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "@/lib/format";

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
