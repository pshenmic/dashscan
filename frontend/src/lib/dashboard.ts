import type { QueryClient } from "@tanstack/react-query";
import { chainHistoryQueryOptions } from "@/lib/api/stats";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork, type Network } from "@/lib/store";

export const DAY = 86_400_000;
export const DASH_LAUNCH_DAY = Date.UTC(2014, 0, 18);
export const utcDayStart = (now: number) => Math.floor(now / DAY) * DAY;

export function statisticsSearch(raw: Record<string, unknown>): {
  days?: number;
  end?: number;
  range?: "all";
} {
  if (raw.range === "all") return { range: "all" };
  const days = Number(raw.days ?? 30);
  const end = Number(raw.end);
  if (!Number.isInteger(days) || days < 1 || days > 90) return {};
  if (
    Number.isSafeInteger(end) &&
    end >= days * DAY &&
    end <= utcDayStart(Date.now()) &&
    end % DAY === 0
  )
    return { days, end };
  return days === 7 || days === 90 ? { days } : {};
}

export function networkStatisticsQuery(
  network: Network,
  end: number,
  days = 30,
  all = false,
) {
  return chainHistoryQueryOptions({
    network,
    timestampStart: new Date(
      all ? DASH_LAUNCH_DAY : end - days * DAY,
    ).toISOString(),
    timestampEnd: new Date(end).toISOString(),
    intervalsCount: all ? 90 : days === 1 ? 24 : Math.min(days, 90),
  });
}

export function prefetchDashboard(
  queryClient: QueryClient,
  {
    days = 30,
    end = utcDayStart(Date.now()),
    range,
  }: ReturnType<typeof statisticsSearch> = {},
) {
  return prefetchSsrData(queryClient, [
    () =>
      queryClient.prefetchQuery(
        networkStatisticsQuery(defaultNetwork, end, days, range === "all"),
      ),
  ]);
}
