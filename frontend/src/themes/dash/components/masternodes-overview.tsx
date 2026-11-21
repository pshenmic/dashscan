import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useClockValue } from "@/components/render-clock";
import { chainHistoryQueryOptions } from "@/lib/api/stats";
import type { Network } from "@/lib/store";
import { snapshotChange } from "@/themes/dash/lib/home-history";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { ChainHistoryChart } from "./chain-history-chart";
import { ChartDateRange, type ChartPeriod } from "./chart-date-range";
import { InfoPopover } from "./info-popover";
import { SkeletonBar } from "./skeleton";

const DAY_MS = 86_400_000;

export function MasternodesOverview({ network }: { network: Network }) {
  const [period, setPeriod] = useState<ChartPeriod>({ days: 30 });
  const { days } = period;
  const today = useClockValue((now) => Math.floor(now / DAY_MS) * DAY_MS);
  const end = period.end ?? today;
  const start = end - days * DAY_MS;
  const history = useQuery(
    chainHistoryQueryOptions({
      network,
      timestampStart: new Date(start - DAY_MS).toISOString(),
      timestampEnd: new Date(end).toISOString(),
      intervalsCount: days === 1 ? 48 : days + 1,
    }),
  );
  const combined = useMemo(
    () =>
      history.data?.map((entry) => ({
        ...entry,
        data: {
          ...entry.data,
          masternodes:
            entry.data.masternodes != null && entry.data.evonodes != null
              ? Number(entry.data.masternodes) + Number(entry.data.evonodes)
              : null,
        },
      })),
    [history.data],
  );
  const change = snapshotChange(combined, "masternodes", days);
  const visible = combined?.filter(
    (entry) => Date.parse(entry.timestamp) >= start,
  );
  return (
    <section className="min-w-0 rounded-3xl dash-home-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-medium">
            <InfoPopover
              label="About masternode growth"
              trigger="Masternode growth"
            >
              Regular masternodes and Evonodes across all statuses. History uses
              network snapshots, not indexer registration dates. Missing
              snapshots are not zero.
            </InfoPopover>
          </h2>
          {change != null && (
            <span
              className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-extrabold tabular-nums ${change > 0 ? "bg-positive-brand/12 text-success" : change < 0 ? "bg-destructive/12 text-destructive" : "bg-secondary text-muted-foreground"}`}
            >
              {change > 0 ? "+" : ""}
              {metricNumber(change)}%
            </span>
          )}
        </div>
        <ChartDateRange value={period} today={today} onChange={setPeriod} />
      </div>
      <div className="mt-3 flex min-h-32 items-end">
        {history.isPending ? (
          <SkeletonBar className="h-32 w-full" />
        ) : (
          <ChainHistoryChart
            data={visible}
            metric="masternodes"
            label="Total masternode snapshot history"
            formatValue={(value) => `${metricNumber(value, 0)} nodes`}
            loading={false}
            error={history.isError}
            onRetry={() => void history.refetch()}
            height={128}
            detailedAxis
          />
        )}
      </div>
    </section>
  );
}
