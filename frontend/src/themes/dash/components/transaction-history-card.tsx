import { useQuery } from "@tanstack/react-query";
import { useClockValue } from "@/components/render-clock";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { transactionsStatsQueryOptions } from "@/lib/api/stats";
import { formatDateTime } from "@/lib/format";
import type { Network } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  transactionHistoryRange,
  transactionHistorySummary,
} from "@/themes/dash/lib/transaction-metrics";
import { AreaChart } from "./area-chart";
export function TransactionHistoryCard({
  network,
  surface = "outlined",
}: {
  network: Network;
  surface?: "outlined" | "subtle";
}) {
  const day = useClockValue((now) => Math.floor(now / 86_400_000) * 86_400_000);
  const range = transactionHistoryRange(day);
  const history = useQuery(
    transactionsStatsQueryOptions({ network, ...range }),
  );
  const summary = transactionHistorySummary(history.data, range.timestampEnd);

  return (
    <div
      className={`flex flex-1 flex-col gap-8 rounded-3xl p-6 ${surface === "subtle" ? "bg-secondary" : "dash-home-panel"}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-medium leading-4 tracking-[-0.009em]">
            Transactions history
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="About transaction history"
                className="size-6 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
              >
                <img
                  src="/icons/home/info.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 dark:invert"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">
              Total transactions in the last 30 complete UTC days, compared with
              the previous 30. Each point is one day's count; the scale starts
              at zero. Counts reflect indexed blocks.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[32px] font-extrabold leading-[1.1] tabular-nums">
            {history.isPending ? "…" : metricNumber(summary.currentTotal, 0)}{" "}
            <span className="text-base font-medium">TXS</span>
          </p>
          {summary.change !== null && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-extrabold tabular-nums ${summary.change > 0 ? "bg-positive-brand/12 text-success" : summary.change < 0 ? "bg-destructive/12 text-destructive" : "bg-foreground/5 text-foreground/64"}`}
            >
              {summary.change > 0 ? "↑" : summary.change < 0 ? "↓" : ""}
              {metricNumber(Math.abs(summary.change))}%
            </span>
          )}
        </div>
        <p className="text-sm font-medium leading-4 tracking-[-0.009em] text-foreground/48">
          {summary.previousTotal !== null ? (
            <>
              Compared to{" "}
              <strong className="font-extrabold">
                {metricNumber(summary.previousTotal, 0)}
              </strong>{" "}
              in the previous 30 days
            </>
          ) : (
            "Last 30 complete days · UTC"
          )}
        </p>
      </div>
      <div className="min-h-[204px]">
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
              compactHeight={164}
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
              className="mt-6 flex justify-between gap-2 text-xs font-medium text-foreground/48"
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
