import type { ApiChainHistoryEntry } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
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
}: {
  data: ApiChainHistoryEntry[] | null | undefined;
  metric: ChainMetric;
  label: string;
  formatValue: (value: number) => string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  height?: number;
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
  return (
    <div className="w-full min-w-0">
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
      <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {formatDateTime(points[0].timestamp, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>
          {formatDateTime(points[points.length - 1].timestamp, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
