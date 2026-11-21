import type { ApiChainHistoryEntry } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type ChainMetric,
  chainMetricSeries,
} from "@/themes/dash/lib/home-history";
import { AreaChart } from "./area-chart";

export function ChainHistoryChart({
  data,
  metric,
  label,
  formatValue,
  loading,
  error,
  onRetry,
  height = 128,
  detailedAxis = false,
  hourlyAxis = false,
  chartAxes = false,
}: {
  data: ApiChainHistoryEntry[] | null | undefined;
  metric: ChainMetric;
  label: string;
  formatValue: (value: number) => string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  height?: number;
  detailedAxis?: boolean;
  hourlyAxis?: boolean;
  chartAxes?: boolean;
}) {
  const points = chainMetricSeries(data, metric);
  if (loading || error || points.length < 2)
    return (
      <div className="w-full min-w-0" aria-busy={loading}>
        <div className="relative" style={{ height }}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 inset-y-1 flex flex-col justify-between"
          >
            {["top", "upper", "lower", "bottom"].map((line) => (
              <div
                key={line}
                className="border-t border-dashed border-foreground/15"
              />
            ))}
          </div>
          <div className="absolute right-0 top-2">
            {loading ? (
              <output className="text-xs text-muted-foreground">
                Loading history…
              </output>
            ) : error ? (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs text-destructive underline"
              >
                Retry history
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Not enough history
              </span>
            )}
          </div>
        </div>
        {!chartAxes && (
          <div aria-hidden="true" className={detailedAxis ? "h-10" : "h-6"} />
        )}
      </div>
    );
  const labelCount = Math.min(points.length, detailedAxis ? 6 : 2);
  const sameDay =
    points[0].timestamp.slice(0, 10) ===
    points[points.length - 1].timestamp.slice(0, 10);
  const labels = Array.from(
    { length: labelCount },
    (_, index) =>
      points[Math.round((index * (points.length - 1)) / (labelCount - 1))],
  );
  return (
    <div className="@container w-full min-w-0">
      <AreaChart
        compact={!chartAxes}
        height={height}
        tooltipPlacement={chartAxes ? "point" : undefined}
        compactHeight={height}
        data={points}
        getValue={(entry) => entry.value}
        getKey={(entry) => entry.timestamp}
        getXLabel={(entry) =>
          chartAxes
            ? formatDateTime(
                entry.timestamp,
                hourlyAxis
                  ? { hour: "2-digit", minute: "2-digit" }
                  : { month: "short", day: "numeric" },
              )
            : formatDateTime(entry.timestamp)
        }
        renderTooltip={(entry) => (
          <>
            <p
              className={
                chartAxes ? "text-xs font-extrabold tabular-nums" : undefined
              }
            >
              {formatValue(entry.value)}
            </p>
            <p>{formatDateTime(entry.timestamp)} UTC</p>
          </>
        )}
        ariaLabel={label}
        fillFadeStart={0.5}
        formatYLabel={
          chartAxes ? (tick) => formatValue(Math.round(tick)) : formatValue
        }
        minimumMax={0}
      />
      {!chartAxes && (
        <div
          className={cn(
            "flex justify-between gap-2 text-xs text-muted-foreground",
            detailedAxis ? "mt-6 font-medium" : "mt-2",
          )}
        >
          {labels.map((point, index) => (
            <span
              key={point.timestamp}
              className={cn(
                "whitespace-nowrap",
                index > 0 &&
                  index < labels.length - 1 &&
                  (index === Math.floor(labels.length / 2)
                    ? "hidden @[14rem]:inline"
                    : "hidden @[20rem]:inline"),
              )}
            >
              {formatDateTime(
                point.timestamp,
                hourlyAxis || sameDay
                  ? { hour: "2-digit", minute: "2-digit" }
                  : {
                      month: "short",
                      day: "numeric",
                    },
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
