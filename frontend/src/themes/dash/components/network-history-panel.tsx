import { useId } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ApiChainHistoryEntry } from "@/lib/api/types";
import { DAY } from "@/lib/dashboard";
import {
  DUFFS_PER_DASH,
  formatDateTime,
  formatHashRate,
  formatNumber,
} from "@/lib/format";
import { type ChainMetric, chainMetricValue } from "../lib/home-history";
import { metricNumber } from "../lib/home-metrics";
import { DaoHint } from "./dao-hint";

interface Metric {
  title: string;
  keys: ChainMetric[];
  format: (value: number) => string;
  hint: string;
}
export const metrics: Metric[] = [
  {
    title: "Transaction",
    keys: ["transactionsPerSecond"],
    hint: "Average number of transactions confirmed per second.",
    format: (value) => `${metricNumber(value)} TPS`,
  },
  {
    title: "Fees",
    keys: ["feesPerBlock"],
    format: (value) =>
      `${formatNumber(value / DUFFS_PER_DASH, { maximumFractionDigits: 8 })} DASH`,
    hint: "Average total transaction fees per block, in DASH.",
  },
  {
    title: "Hashrate",
    hint: "Estimated number of hashes Dash miners compute per second.",
    keys: ["hashRate"],
    format: (value) => (value === 0 ? "0 H/s" : formatHashRate(value)),
  },
  {
    title: "Difficulty",
    hint: "How hard it is for miners to find a valid Dash block.",
    keys: ["difficulty"],
    format: (value) => metricNumber(value),
  },
  {
    title: "Masternodes",
    keys: ["masternodes", "masternodesEnabled"],
    format: (value) => metricNumber(value, 0),
    hint: "Registered and enabled regular masternodes, excluding Evonodes.",
  },
  {
    title: "Evonodes",
    hint: "Registered and enabled Evolution masternodes on the Dash network.",
    keys: ["evonodes", "evonodesEnabled"],
    format: (value) => metricNumber(value, 0),
  },
];
const chartDate = (time: number, hourly: boolean, all = false) =>
  formatDateTime(
    time,
    hourly
      ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
      : all
        ? { month: "short", year: "numeric" }
        : { month: "short", day: "numeric" },
  );

const tooltipDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function intervalLabel(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return "";
  if (end - start <= DAY / 24)
    return `${chartDate(start, false)} · ${chartDate(start, true)}`;
  return tooltipDate.formatRange(start, end - 1);
}

export function HistoryPanel({
  metric,
  buckets,
  rangeEnd,
  hourly,
  all,
  loading,
  failed,
}: {
  metric: Metric;
  buckets: { time: number; entry?: ApiChainHistoryEntry }[];
  rangeEnd: number;
  hourly: boolean;
  all: boolean;
  loading: boolean;
  failed: boolean;
}) {
  const { keys, title, format } = metric;
  const fillId = useId();
  const nodeCounts = keys[0] === "masternodes" || keys[0] === "evonodes";
  const evo = keys[0] === "evonodes";
  const series = keys.map((key, index) => ({
    key,
    label: nodeCounts ? (index === 0 ? "Registered" : "Enabled") : title,
    color: index ? "var(--success)" : "var(--chart-1)",
  }));
  const rows = buckets.map(({ time, entry }, index) => ({
    time,
    end: buckets[index + 1]?.time ?? rangeEnd,
    values: Object.fromEntries(
      keys.map((key) => [key, entry ? chainMetricValue(entry, key) : null]),
    ),
  }));
  const present = rows.filter((row) =>
    keys.some((key) => row.values[key] != null),
  );
  const incomplete = rows.some((row) =>
    keys.some((key) => row.values[key] == null),
  );
  const last = rows.at(-1);
  const baseline = rows[0]?.values;
  const showChange =
    !all &&
    keys[0] === "masternodes" &&
    baseline &&
    keys.every((key) => baseline[key] != null);
  const signedCount = (value: number) =>
    formatNumber(value, { signDisplay: "exceptZero" });
  const fees = keys[0] === "feesPerBlock";
  const firstFee = fees
    ? rows.findIndex((row) => (row.values.feesPerBlock ?? 0) > 0)
    : -1;
  const firstEvo =
    all && evo
      ? rows.findIndex((row) => keys.some((key) => (row.values[key] ?? 0) > 0))
      : -1;
  const firstPresent = all && nodeCounts ? rows.indexOf(present[0]) : -1;
  const plotted = rows.slice(Math.max(0, firstFee, firstEvo, firstPresent));
  const rates =
    all && (keys[0] === "hashRate" || keys[0] === "difficulty")
      ? present.flatMap((row) => row.values[keys[0]] ?? [])
      : [];
  const logarithmic =
    rates.length > 1 &&
    Math.min(...rates) > 0 &&
    Math.max(...rates) / Math.min(...rates) >= 100;
  const interval = `Last ${all ? "interval" : hourly ? "hour" : "day"} in the selected range`;
  return (
    <article className="min-w-0 space-y-5 rounded-3xl dash-home-panel p-4 sm:p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold leading-tight text-foreground">
          <DaoHint description={metric.hint}>{title}</DaoHint>
        </h2>
        <div className="ml-auto flex flex-col items-end gap-x-4 gap-y-1 tabular-nums sm:flex-row sm:items-baseline">
          {series.map(({ key, label, color }) => {
            const value = last?.values[key];
            const formatted = value == null ? "—" : format(value);
            const [amount, unit] = formatted.split(" ");
            return (
              <span key={key} className="inline-flex items-baseline gap-2">
                {series.length > 1 && (
                  <span className="text-sm text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="inline-block size-2 align-middle"
                      style={{ backgroundColor: color }}
                    />{" "}
                    {label}
                  </span>
                )}
                <span>
                  <span className="sr-only">{interval}: </span>
                  <span className="whitespace-nowrap text-base font-medium leading-tight">
                    {amount}
                    {unit && (
                      <>
                        {" "}
                        <span className="text-sm text-muted-foreground">
                          {unit}
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </span>
            );
          })}
        </div>
      </header>
      {present.length ? (
        <ChartContainer
          config={{}}
          className="h-44 w-full aspect-auto rounded-md [&_:focus:not(:focus-visible)]:outline-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
        >
          <ComposedChart
            data={
              showChange
                ? plotted.map((row) => ({
                    ...row,
                    changes: Object.fromEntries(
                      keys.map((key) => [
                        key,
                        row.values[key] == null
                          ? null
                          : row.values[key] - Number(baseline[key]),
                      ]),
                    ),
                  }))
                : plotted
            }
            accessibilityLayer
            title={title}
            margin={{ top: 8, right: 14, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={nodeCounts ? 0.18 : 0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={nodeCounts ? 0 : 0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              tick={{ fill: "var(--muted-foreground)" }}
              dataKey="time"
              tickFormatter={(time) =>
                chartDate(
                  time,
                  hourly,
                  all &&
                    (!fees ||
                      (last && last.time - plotted[0].time > 180 * DAY)),
                )
              }
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis
              scale={logarithmic ? "log" : "auto"}
              domain={
                logarithmic
                  ? ["dataMin", "dataMax"]
                  : evo && !all
                    ? ["dataMin - 1", "dataMax + 1"]
                    : showChange
                      ? ["auto", "auto"]
                      : [0, "auto"]
              }
              allowDecimals={!nodeCounts}
              tick={{ fill: "var(--muted-foreground)" }}
              tickCount={4}
              width="auto"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                showChange
                  ? signedCount(value)
                  : keys[0] === "difficulty"
                    ? formatNumber(value, { notation: "compact" })
                    : format(value)
              }
            />
            <ChartTooltip
              content={(props) => (
                <ChartTooltipContent
                  {...{
                    ...props,
                    payload: series.flatMap(
                      ({ label }) =>
                        props.payload?.filter((item) => item.name === label) ??
                        [],
                    ),
                  }}
                  labelFormatter={(_, payload) =>
                    intervalLabel(
                      payload[0]?.payload.time,
                      payload[0]?.payload.end,
                    )
                  }
                  formatter={(value, name, item) => (
                    <span className="inline-flex items-center gap-1">
                      {series.length > 1 && (
                        <span
                          aria-hidden="true"
                          className="size-2"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      {nodeCounts && `${name}: `}
                      {showChange
                        ? `${signedCount(Number(value))} (${format(item.payload.values[name === "Registered" ? keys[0] : keys[1]])} total)`
                        : format(Number(value))}
                    </span>
                  )}
                />
              )}
            />
            {fees ? (
              <Bar
                dataKey="values.feesPerBlock"
                name={title}
                fill={`url(#${fillId})`}
                stroke={series[0].color}
                strokeWidth={1}
                radius={[2, 2, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
              />
            ) : (
              series.map(({ key, label, color }, index) => (
                <Area
                  key={key}
                  dataKey={`${showChange ? "changes" : "values"}.${key}`}
                  name={label}
                  stroke={color}
                  strokeWidth={nodeCounts ? 2 : 1.5}
                  fill={index ? "none" : `url(#${fillId})`}
                  fillOpacity={1}
                  baseValue={logarithmic || (evo && !all) ? "dataMin" : 0}
                  dot={
                    series.length === 1
                      ? incomplete
                        ? { r: 2 }
                        : false
                      : ({ cx, cy, index: point, value }) => {
                          const visible =
                            value != null &&
                            cx != null &&
                            cy != null &&
                            Number.isFinite(cx) &&
                            Number.isFinite(cy) &&
                            (point %
                              Math.max(1, Math.ceil(plotted.length / 6)) ===
                              0 ||
                              point === plotted.length - 1);
                          if (!visible) return <g key={point} />;
                          return index ? (
                            <rect
                              key={point}
                              x={cx - 3}
                              y={cy - 3}
                              width={6}
                              height={6}
                              fill={color}
                            />
                          ) : (
                            <circle
                              key={point}
                              cx={cx}
                              cy={cy}
                              r={3}
                              fill={color}
                            />
                          );
                        }
                  }
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))
            )}
          </ComposedChart>
        </ChartContainer>
      ) : (
        <output className="grid h-44 place-items-center text-sm text-muted-foreground">
          {loading
            ? "Loading history…"
            : failed
              ? "History unavailable."
              : "No data in this period."}
        </output>
      )}
    </article>
  );
}
