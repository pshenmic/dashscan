import type { ApiChainHistoryEntry } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type ChainMetric,
  chainMetricSeries,
} from "@/themes/dash/lib/home-history";
import { AreaChart } from "./area-chart";
import { MissingApiData } from "./missing-api-data";

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
}) {
  const points = chainMetricSeries(data, metric);
  if (loading)
    return <p className="text-xs text-muted-foreground">Loading history…</p>;
  if (error)
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-xs text-destructive underline"
      >
        Retry history
      </button>
    );
  if (points.length < 2)
    return (
      <MissingApiData
        description={`${label}: not enough historical coverage yet. Missing snapshots are not zero values.`}
      />
    );
  const labelCount = Math.min(points.length, detailedAxis ? 5 : 2);
  const labels = Array.from(
    { length: labelCount },
    (_, index) =>
      points[Math.round((index * (points.length - 1)) / (labelCount - 1))],
  );
  return (
    <div className="@container w-full min-w-0">
      <AreaChart
        compact
        compactHeight={height}
        data={points}
        getValue={(entry) => entry.value}
        getKey={(entry) => entry.timestamp}
        getXLabel={(entry) => formatDateTime(entry.timestamp)}
        renderTooltip={(entry) => (
          <>
            <p>{formatDateTime(entry.timestamp)}</p>
            <p>{formatValue(entry.value)}</p>
          </>
        )}
        ariaLabel={label}
        formatYLabel={formatValue}
        minimumMax={0}
      />
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
            {formatDateTime(point.timestamp, {
              month: "short",
              day: "numeric",
            })}
          </span>
        ))}
      </div>
    </div>
  );
}
