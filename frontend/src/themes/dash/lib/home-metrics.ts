import type { ApiBlock, ApiHistoricalEntry } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

export function metricNumber(
  value: number | null | undefined,
  maximumFractionDigits = 2,
) {
  return value != null && Number.isFinite(value)
    ? formatNumber(
        value,
        value !== 0 && Math.abs(value) < 0.01
          ? { maximumSignificantDigits: 3 }
          : { maximumFractionDigits },
      )
    : "—";
}

export function metricBytes(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) return "—";
  const units = [
    [1e9, "GB"],
    [1e6, "MB"],
    [1e3, "kB"],
    [1, "B"],
  ] as const;
  const [scale, unit] =
    units.find(([threshold]) => value >= threshold) ?? units[3];
  return `${metricNumber(value / scale)} ${unit}`;
}

export function sortedHistory(history: ApiHistoricalEntry[] | undefined) {
  return (history ?? [])
    .filter(
      (entry) =>
        Number.isFinite(entry.value) && Number.isFinite(entry.timestamp),
    )
    .sort((first, second) => first.timestamp - second.timestamp);
}

export function historyChange(history: ApiHistoricalEntry[]) {
  if (history.length < 2 || history[0].value <= 0) return null;
  const change =
    ((history[history.length - 1].value - history[0].value) /
      history[0].value) *
    100;
  return Number.isFinite(change) ? change : null;
}

export function estimatedSupply(
  marketCap: number | undefined,
  price: number | undefined,
) {
  if (
    marketCap == null ||
    price == null ||
    !Number.isFinite(marketCap) ||
    !Number.isFinite(price) ||
    marketCap < 0 ||
    price <= 0
  )
    return null;
  const supply = marketCap / price;
  return Number.isFinite(supply) ? supply : null;
}

export function upcomingBlocks(
  latest: ApiBlock | undefined,
  blockTime: number | null | undefined,
) {
  if (
    !latest ||
    blockTime == null ||
    !Number.isFinite(blockTime) ||
    blockTime <= 0
  )
    return [];
  const timestamp = Date.parse(latest.timestamp);
  if (!Number.isFinite(timestamp)) return [];
  return [1, 2].map((offset) => ({
    height: latest.height + offset,
    expectedAt: timestamp + blockTime * offset,
  }));
}
