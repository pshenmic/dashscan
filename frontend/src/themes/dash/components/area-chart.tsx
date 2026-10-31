import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { buildSmoothPath } from "@/themes/dash/lib/chart-utils";

type AreaChartProps<T> = {
  data: T[];
  getValue: (item: T) => number;
  getKey: (item: T) => string | number;
  getXLabel: (item: T) => string;
  renderTooltip: (item: T) => ReactNode;
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  compactHeight?: number;
  minimumMax?: number;
  formatYLabel?: (value: number) => string;
};

export function AreaChart<T>({
  data,
  getValue,
  getKey,
  getXLabel,
  renderTooltip,
  ariaLabel,
  className,
  compact = false,
  compactHeight = 62,
  minimumMax = 1,
  formatYLabel = String,
}: AreaChartProps<T>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();
  const instructionsId = useId();
  const width = compact ? 245 : 700;
  const height = compact ? compactHeight : 260;
  const paddingLeft = compact ? 0.5 : 40;
  const paddingRight = compact ? 0.5 : 20;
  const paddingTop = compact ? 4 : 24;
  const paddingBottom = compact ? 4 : 32;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const geometry = useMemo(() => {
    if (data.length === 0) return null;

    const maxValue = Math.max(
      ...data.map(getValue),
      minimumMax,
      Number.EPSILON,
    );
    const magnitude = 10 ** Math.floor(Math.log10(maxValue || 1));
    const step =
      magnitude < 1 ? magnitude : magnitude <= 5 ? magnitude : magnitude / 2;
    const minValue = Math.min(...data.map(getValue));
    const rangePadding = Math.max(
      (maxValue - minValue) * 0.1,
      Math.abs(maxValue) * 0.001,
      Number.EPSILON,
    );
    const axisMin = compact ? Math.max(0, minValue - rangePadding) : 0;
    const niceMax = compact
      ? maxValue + rangePadding
      : Math.ceil(maxValue / step) * step || 1;
    const axisRange = niceMax - axisMin;
    const yTicks = compact
      ? [0, 1, 2, 3].map((index) => axisMin + (axisRange * index) / 3)
      : [
          0,
          niceMax < 3 ? niceMax / 3 : Math.round(niceMax / 3),
          niceMax < 3 ? (niceMax * 2) / 3 : Math.round((niceMax * 2) / 3),
          niceMax,
        ];

    const points = data.map((entry, i) => {
      const x =
        paddingLeft +
        (data.length > 1
          ? (i / (data.length - 1)) * chartWidth
          : chartWidth / 2);
      const y =
        paddingTop +
        chartHeight -
        ((getValue(entry) - axisMin) / axisRange) * chartHeight;
      return { x, y, entry };
    });

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L${points[points.length - 1].x},${paddingTop + chartHeight} L${points[0].x},${paddingTop + chartHeight} Z`;
    const labelInterval = Math.max(1, Math.floor(data.length / 8));

    return {
      axisMin,
      axisRange,
      yTicks,
      points,
      linePath,
      areaPath,
      labelInterval,
    };
  }, [
    data,
    getValue,
    minimumMax,
    compact,
    chartWidth,
    chartHeight,
    paddingLeft,
    paddingTop,
  ]);

  if (!geometry) return null;

  const {
    axisMin,
    axisRange,
    yTicks,
    points,
    linePath,
    areaPath,
    labelInterval,
  } = geometry;
  const selectedIndex = Math.min(
    hoveredIndex ?? points.length - 1,
    points.length - 1,
  );
  const selected = points[selectedIndex];

  return (
    <div
      className={cn(
        "relative w-full rounded-[20px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        className,
      )}
    >
      <p id={instructionsId} className="sr-only">
        Use arrow keys to explore values, Home and End to jump, or tap the
        chart. Escape dismisses the details.
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={compact ? { height } : undefined}
        preserveAspectRatio={compact ? "none" : "xMidYMid meet"}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="oklch(from var(--chart-1) l c h)"
              stopOpacity={compact ? 0.15 : 0.35}
            />
            <stop
              offset="100%"
              stopColor="oklch(from var(--chart-1) l c h)"
              stopOpacity={compact ? 0 : 0.05}
            />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y =
            paddingTop +
            chartHeight -
            ((tick - axisMin) / axisRange) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke={compact ? "var(--foreground)" : "currentColor"}
                strokeOpacity={compact ? 0.15 : 0.1}
                strokeDasharray={compact ? "2 2" : "3 3"}
                vectorEffect={compact ? "non-scaling-stroke" : undefined}
              />
              {!compact && (
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize="11"
                >
                  {formatYLabel(tick)}
                </text>
              )}
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="oklch(from var(--chart-1) l c h)"
          strokeWidth={compact ? 1 : 1.5}
          strokeLinecap={compact ? "round" : undefined}
          vectorEffect={compact ? "non-scaling-stroke" : undefined}
        />

        {hoveredIndex !== null && (
          <g className="text-accent">
            <line
              x1={selected.x}
              x2={selected.x}
              y1={paddingTop}
              y2={height - paddingBottom}
              stroke="currentColor"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
              vectorEffect={compact ? "non-scaling-stroke" : undefined}
            />
            {!compact && (
              <circle
                cx={selected.x}
                cy={selected.y}
                r={5}
                fill="var(--card)"
                stroke="currentColor"
                strokeWidth={2}
              />
            )}
          </g>
        )}

        {!compact &&
          points.map((p, i) => {
            if (i % labelInterval !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={`label-${getKey(p.entry)}`}
                x={p.x}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="11"
              >
                {getXLabel(p.entry)}
              </text>
            );
          })}
      </svg>
      {compact && hoveredIndex !== null && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-chart-1 bg-card"
          style={{
            left: `${(selected.x / width) * 100}%`,
            top: `${(selected.y / height) * 100}%`,
          }}
        />
      )}
      <input
        type="range"
        min={0}
        max={points.length - 1}
        step={1}
        value={selectedIndex}
        aria-label={`Explore ${ariaLabel}`}
        aria-describedby={instructionsId}
        aria-valuetext={`${getXLabel(selected.entry)}: ${formatYLabel(getValue(selected.entry))}`}
        className="absolute m-0 cursor-crosshair touch-pan-y opacity-0"
        style={{
          left: `${(paddingLeft / width) * 100}%`,
          top: `${(paddingTop / height) * 100}%`,
          width: `${(chartWidth / width) * 100}%`,
          height: `${(chartHeight / height) * 100}%`,
        }}
        onChange={(event) => setHoveredIndex(Number(event.target.value))}
        onFocus={() => setHoveredIndex(selectedIndex)}
        onBlur={() => setHoveredIndex(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setHoveredIndex(null);
          }
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = Math.max(
            0,
            Math.min(1, (event.clientX - bounds.left) / bounds.width),
          );
          setHoveredIndex(Math.round(ratio * (points.length - 1)));
        }}
        onPointerLeave={(event) => {
          if (event.currentTarget !== document.activeElement)
            setHoveredIndex(null);
        }}
      />
      {hoveredIndex !== null && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute z-10 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-card",
            compact
              ? "bottom-full right-0 mb-2 w-max max-w-[min(16rem,calc(100vw-2rem))]"
              : "right-2 top-0 max-w-[calc(100%-1rem)]",
          )}
        >
          {renderTooltip(selected.entry)}
        </div>
      )}
    </div>
  );
}
