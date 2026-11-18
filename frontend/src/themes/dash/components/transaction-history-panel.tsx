import { useQuery } from "@tanstack/react-query";
import { ChartLine } from "lucide-react";
import { useState } from "react";
import { useClockValue } from "@/components/render-clock";
import { transactionsStatsQueryOptions } from "@/lib/api/stats";
import { formatDateTime } from "@/lib/format";
import type { Network } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  transactionHistoryRange,
  transactionHistorySummary,
} from "@/themes/dash/lib/transaction-metrics";
import { AreaChart } from "./area-chart";
import { ChartDateRange, type ChartPeriod } from "./chart-date-range";
import { SkeletonBar } from "./skeleton";

export function TransactionHistoryPanel({
  network,
  title,
}: {
  network: Network;
  title: string;
}) {
  const day = useClockValue((now) => Math.floor(now / 86_400_000) * 86_400_000);
  const [period, setPeriod] = useState<ChartPeriod>({ days: 30 });
  const range = transactionHistoryRange(period.end ?? day, period.days);
  const midpoint = new Date(
    Date.parse(range.timestampEnd) - period.days * 86_400_000,
  ).toISOString();
  const history = useQuery(
    transactionsStatsQueryOptions({
      network,
      timestampStart: period.days === 1 ? range.timestampStart : midpoint,
      timestampEnd: range.timestampEnd,
      intervalsCount: Math.max(2, period.days),
    }),
  );
  const previousHistory = useQuery({
    ...transactionsStatsQueryOptions({
      network,
      timestampStart: range.timestampStart,
      timestampEnd: midpoint,
      intervalsCount: Math.max(2, period.days),
    }),
    enabled: period.days > 1,
  });
  const summary = transactionHistorySummary(
    [
      ...(period.days > 1 ? (previousHistory.data ?? []) : []),
      ...(history.data ?? []),
    ],
    range.timestampEnd,
    period.days,
  );
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-3xl dash-home-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 max-w-full items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-subtle text-accent">
            <ChartLine
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.75}
            />
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {title}
            </h2>
            <p className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-semibold leading-tight tabular-nums text-foreground">
              <span className="whitespace-nowrap">
                {history.isPending ? (
                  <SkeletonBar className="inline-block h-7 w-32" />
                ) : (
                  metricNumber(summary.currentTotal, 0)
                )}{" "}
                <span className="text-base font-medium text-muted-foreground">
                  Txs
                </span>
              </span>
              {summary.change != null && (
                <span
                  className="whitespace-nowrap rounded-full bg-action-subtle px-2 py-1 text-xs text-accent"
                  title={`Compared with the preceding ${period.days} complete UTC days`}
                >
                  {summary.change > 0 ? "↑" : summary.change < 0 ? "↓" : ""}{" "}
                  {metricNumber(Math.abs(summary.change))}%
                </span>
              )}
            </p>
          </div>
        </div>
        <ChartDateRange value={period} today={day} onChange={setPeriod} />
      </div>
      <div className="grid h-[156px] min-w-0 place-items-center">
        {history.isPending ? (
          <section
            aria-busy="true"
            aria-label="Loading transaction history"
            className="w-full space-y-3"
          >
            <SkeletonBar className="h-28 w-full" />
            <div className="flex justify-between gap-6">
              <SkeletonBar className="w-16" />
              <SkeletonBar className="w-16" />
              <SkeletonBar className="w-16" />
            </div>
          </section>
        ) : history.isError ? (
          <button
            type="button"
            className="text-sm text-destructive underline"
            onClick={() => void history.refetch()}
          >
            Retry transaction history
          </button>
        ) : summary.currentComplete ? (
          <AreaChart
            data={summary.current}
            height={156}
            minimumMax={3}
            tooltipPlacement="point"
            getValue={(entry) => entry.data.count}
            getKey={(entry) => entry.timestamp}
            getXLabel={(entry) =>
              formatDateTime(entry.timestamp, {
                month: "short",
                day: "numeric",
              })
            }
            renderTooltip={(entry) => (
              <>
                <p className="text-xs font-extrabold tabular-nums">
                  {metricNumber(entry.data.count, 0)} Txs
                </p>
                <p className="text-[10px] font-medium text-foreground/64">
                  {formatDateTime(entry.timestamp, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  UTC
                </p>
              </>
            )}
            ariaLabel="Daily confirmed transactions"
            formatYLabel={(value) => metricNumber(value, 0)}
          />
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <p>No history for this period.</p>
            <button
              type="button"
              className="mt-2 text-accent underline"
              onClick={() => void history.refetch()}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
