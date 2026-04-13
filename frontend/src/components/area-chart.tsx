import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import { buildSmoothPath } from "@/lib/chart-utils";
import { cn } from "@/lib/utils";

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
};

export function AreaChart<T>({
  data,
  getValue,
  getKey,
  getXLabel,
  renderTooltip,
  ariaLabel,
  className,
}: AreaChartProps<T>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();

  const geometry = useMemo(() => {
    if (data.length === 0) return null;

    const maxValue = Math.max(...data.map(getValue), 1);
    const magnitude = 10 ** Math.floor(Math.log10(maxValue || 1));
    const step = magnitude < 1 ? 1 : magnitude <= 5 ? magnitude : magnitude / 2;
    const niceMax = Math.ceil(maxValue / step) * step || 1;
    const yTicks = [
      0,
      Math.round(niceMax / 3),
      Math.round((niceMax * 2) / 3),
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
  }, [data, getValue]);

  if (!geometry) return null;

  const { niceMax, yTicks, points, linePath, areaPath, labelInterval } =
    geometry;

  return (
    <div className={cn("relative w-full rounded-[20px]", className)}>
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
              stopColor="oklch(from var(--accent) l c h)"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="oklch(from var(--accent) l c h)"
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
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="oklch(from var(--accent) l c h)"
          strokeWidth="1.5"
        />

        {points.map((p, i) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: SVG hover indicators
          <circle
            key={getKey(p.entry)}
            cx={p.x}
            cy={p.y}
            r={hoveredIndex === i ? 4 : 2}
            fill={
              hoveredIndex === i
                ? "oklch(from var(--accent) l c h)"
                : "transparent"
            }
            stroke={
              hoveredIndex === i
                ? "oklch(from var(--accent) l c h)"
                : "transparent"
            }
            strokeWidth="1.5"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}

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

        {points.map((p, i) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: SVG hover zones
          <rect
            key={`hover-${getKey(p.entry)}`}
            x={p.x - chartWidth / data.length / 2}
            y={paddingTop}
            width={chartWidth / data.length}
            height={chartHeight}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
      </svg>

      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          className="pointer-events-none absolute z-10 rounded-[10px] border border-[#e4ebfb] bg-white px-2.5 py-1.5 text-[10px] text-[#21314d] shadow-[0_8px_24px_rgba(25,51,102,0.08)]"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
            top: `${(points[hoveredIndex].y / height) * 100 - 12}%`,
            transform: "translateX(-50%)",
          }}
        >
          {renderTooltip(points[hoveredIndex].entry)}
        </div>
      )}
    </div>
  );
}
