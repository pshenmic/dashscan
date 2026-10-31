import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { buildSmoothPath } from "@/themes/dash/lib/chart-utils";

const paddingLeft = 40;
const paddingRight = 20;
const paddingTop = 24;
const paddingBottom = 32;
const width = 700;
const height = 260;
const chartWidth = width - paddingLeft - paddingRight;
const chartHeight = height - paddingTop - paddingBottom;

type AreaChartProps<T> = {
  data: T[];
  getValue: (item: T) => number;
  getKey: (item: T) => string | number;
  getXLabel: (item: T) => string;
  renderTooltip: (item: T) => ReactNode;
  ariaLabel: string;
  className?: string;
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
  minimumMax = 1,
  formatYLabel = String,
}: AreaChartProps<T>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();
  const instructionsId = useId();

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
    const niceMax = Math.ceil(maxValue / step) * step || 1;
    const yTicks = [
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
        paddingTop + chartHeight - (getValue(entry) / niceMax) * chartHeight;
      return { x, y, entry };
    });

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L${points[points.length - 1].x},${paddingTop + chartHeight} L${points[0].x},${paddingTop + chartHeight} Z`;
    const labelInterval = Math.max(1, Math.floor(data.length / 8));

    return { niceMax, yTicks, points, linePath, areaPath, labelInterval };
  }, [data, getValue, minimumMax]);

  if (!geometry) return null;

  const { niceMax, yTicks, points, linePath, areaPath, labelInterval } =
    geometry;
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
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="oklch(from var(--chart-1) l c h)"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="oklch(from var(--chart-1) l c h)"
              stopOpacity="0.05"
            />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = paddingTop + chartHeight - (tick / niceMax) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize="11"
              >
                {formatYLabel(tick)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="oklch(from var(--chart-1) l c h)"
          strokeWidth="1.5"
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
            />
            <circle
              cx={selected.x}
              cy={selected.y}
              r={5}
              fill="var(--card)"
              stroke="currentColor"
              strokeWidth={2}
            />
          </g>
        )}

        {points.map((p, i) => {
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
          className="pointer-events-none absolute right-2 top-0 z-10 max-w-[calc(100%-1rem)] rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-card"
        >
          {renderTooltip(selected.entry)}
        </div>
      )}
    </div>
  );
}
