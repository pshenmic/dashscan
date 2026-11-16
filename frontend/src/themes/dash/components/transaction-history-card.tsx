import { useQuery } from "@tanstack/react-query";
import { useClockValue } from "@/components/render-clock";
import { transactionsStatsQueryOptions } from "@/lib/api/stats";
import { formatDateTime } from "@/lib/format";
import type { Network } from "@/lib/store";
import { cn } from "@/lib/utils";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  transactionHistoryRange,
  transactionHistorySummary,
} from "@/themes/dash/lib/transaction-metrics";
import { AreaChart } from "./area-chart";
import { InfoPopover } from "./info-popover";
export function TransactionHistoryCard({
  network,
  surface = "outlined",
  chartHeight = 164,
  inlineHeader = false,
  className,
}: {
  network: Network;
  surface?: "outlined" | "subtle";
  chartHeight?: number;
  inlineHeader?: boolean;
  className?: string;
}) {
  const day = useClockValue((now) => Math.floor(now / 86_400_000) * 86_400_000);
  const range = transactionHistoryRange(day);
  const history = useQuery(
    transactionsStatsQueryOptions({ network, ...range }),
  );
  const summary = transactionHistorySummary(history.data, range.timestampEnd);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-8 rounded-3xl p-6",
        surface === "subtle" ? "bg-secondary" : "dash-home-panel",
        className,
      )}
    >
      <div
        className={
          inlineHeader
            ? "flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
            : "space-y-2"
        }
      >
        <div
          className={
            inlineHeader
              ? "flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-2"
              : "space-y-2"
          }
        >
          <h3
            className={cn(
              "text-base font-medium leading-4 tracking-[-0.009em]",
              inlineHeader && "text-sm text-muted-foreground",
            )}
          >
            <InfoPopover
              label="About transaction history"
              trigger="Transactions history"
            >
              Total transactions in the last 30 complete UTC days, compared with
              the previous 30. Each point is one day's count; the scale starts
              at zero. Counts reflect indexed blocks.
            </InfoPopover>
          </h3>
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-4 gap-y-2",
              inlineHeader && "gap-x-2",
            )}
          >
            <p
              className={cn(
                "text-[32px] font-extrabold leading-[1.1] tabular-nums",
                inlineHeader && "whitespace-nowrap text-2xl font-semibold",
              )}
            >
              {history.isPending ? "…" : metricNumber(summary.currentTotal, 0)}{" "}
              <span
                className={cn(
                  "text-base font-medium",
                  inlineHeader && "text-muted-foreground",
                )}
              >
                {inlineHeader ? "Txs" : "TXS"}
              </span>
            </p>
            {summary.change !== null && (
              <span
                className={cn(
                  "whitespace-nowrap rounded-full px-2 py-1 text-xs font-extrabold tabular-nums",
                  summary.change > 0
                    ? "bg-positive-brand/12 text-success"
                    : summary.change < 0
                      ? "bg-destructive/12 text-destructive"
                      : "bg-foreground/5 text-muted-foreground",
                  inlineHeader && "font-medium",
                )}
              >
                {summary.change > 0 ? "↑" : summary.change < 0 ? "↓" : ""}
                {metricNumber(Math.abs(summary.change))}%
              </span>
            )}
          </div>
        </div>
        <p
          className={cn(
            "text-sm font-medium leading-4 tracking-[-0.009em] text-muted-foreground",
            inlineHeader && "ml-auto text-right text-xs",
          )}
        >
          {summary.previousTotal !== null ? (
            <>
              {inlineHeader ? "vs " : "Compared to "}
              <strong
                className={inlineHeader ? "font-semibold" : "font-extrabold"}
              >
                {metricNumber(summary.previousTotal, 0)}
              </strong>{" "}
              {inlineHeader ? "· prev. 30D" : "in the previous 30 days"}
            </>
          ) : inlineHeader ? (
            "30D · UTC"
          ) : (
            "Last 30 complete days · UTC"
          )}
        </p>
      </div>
      <div style={{ minHeight: chartHeight + 40 }}>
        {history.isPending ? (
          <output className="dash-body-compact block py-8 text-muted-foreground">
            Loading history…
          </output>
        ) : history.isError && !summary.currentComplete ? (
          <p role="alert" className="dash-body-compact py-6 text-destructive">
            Could not load history.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void history.refetch()}
            >
              Try again
            </button>
          </p>
        ) : !summary.currentComplete ? (
          <p className="dash-body-compact py-8 text-muted-foreground">
            {summary.current.length
              ? "Incomplete history for this period."
              : "No transaction history for this period."}
          </p>
        ) : (
          <>
            {history.isError && (
              <p role="alert" className="mb-3 text-xs text-destructive">
                Could not refresh history. Showing the last available data.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void history.refetch()}
                >
                  Try again
                </button>
              </p>
            )}
            <AreaChart
              data={summary.current}
              compact
              compactHeight={chartHeight}
              zeroBaseline
              getValue={(entry) => entry.data.count}
              getKey={(entry) => entry.timestamp}
              getXLabel={(entry) =>
                formatDateTime(entry.timestamp, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }
              getValueText={(entry) =>
                `${formatDateTime(entry.timestamp, { month: "long", day: "numeric", year: "numeric" })} UTC: ${metricNumber(entry.data.count, 0)} transactions`
              }
              renderTooltip={(entry) => (
                <>
                  <p>{metricNumber(entry.data.count, 0)} transactions</p>
                  <p>
                    {formatDateTime(entry.timestamp, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · UTC
                  </p>
                </>
              )}
              ariaLabel="Daily transactions over the last 30 complete UTC days"
              formatYLabel={(value) => metricNumber(value, 0)}
            />
            <div
              aria-hidden="true"
              className="mt-6 flex justify-between gap-2 text-xs font-medium text-muted-foreground"
            >
              {[0, 10, 19, 29].map((index) => (
                <span key={summary.current[index].timestamp}>
                  {formatDateTime(summary.current[index].timestamp, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ))}
            </div>
            {!summary.previousComplete && (
              <p className="mt-3 text-xs text-muted-foreground">
                Previous period incomplete; comparison unavailable.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
