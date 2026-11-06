import { useQuery } from "@tanstack/react-query";
import { useClockValue } from "@/components/render-clock";
import { chainHistoryQueryOptions } from "@/lib/api/stats";
import type { ApiChainHistoryEntry } from "@/lib/api/types";
import type { Network } from "@/lib/store";

export function useHistoryRange(days = 30, intervalsCount = days) {
  const end = useClockValue((now) => Math.floor(now / 3_600_000) * 3_600_000);
  return {
    timestampStart: new Date(end - days * 86_400_000).toISOString(),
    timestampEnd: new Date(end).toISOString(),
    intervalsCount,
  };
}

export function useHomeChainHistory(
  network: Network,
  days = 30,
  intervalsCount = days,
) {
  const range = useHistoryRange(days, intervalsCount);
  return useQuery(chainHistoryQueryOptions({ network, ...range }));
}

export type ChainMetric = keyof ApiChainHistoryEntry["data"];

export function chainMetricValue(
  entry: ApiChainHistoryEntry,
  metric: ChainMetric,
) {
  if (
    (metric === "fees" || metric === "coinjoinAmount") &&
    entry.data.hashRate == null
  )
    return null;
  const raw = entry.data[metric];
  const value = raw == null ? null : Number(raw);
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

export function chainMetricSeries(
  entries: ApiChainHistoryEntry[] | null | undefined,
  metric: ChainMetric,
) {
  const points: { timestamp: string; value: number }[] = [];
  for (const entry of [...(entries ?? [])].sort(
    (first, second) =>
      Date.parse(first.timestamp) - Date.parse(second.timestamp),
  )) {
    const value = chainMetricValue(entry, metric);
    if (value == null || !Number.isFinite(Date.parse(entry.timestamp))) {
      points.length = 0;
    } else {
      points.push({ timestamp: entry.timestamp, value });
    }
  }
  return points;
}

export function percentageChange(
  current: number | null | undefined,
  previous: number | null | undefined,
) {
  return current != null &&
    previous != null &&
    Number.isFinite(current) &&
    Number.isFinite(previous) &&
    previous > 0
    ? ((current - previous) / previous) * 100
    : null;
}

export function snapshotChange(
  entries: ApiChainHistoryEntry[] | null | undefined,
  metric: ChainMetric,
  days: number,
) {
  const last = entries?.at(-1);
  if (!last) return null;
  const previous = entries?.find(
    (entry) =>
      Date.parse(entry.timestamp) ===
      Date.parse(last.timestamp) - days * 86_400_000,
  );
  return previous
    ? percentageChange(
        chainMetricValue(last, metric),
        chainMetricValue(previous, metric),
      )
    : null;
}
