import { useId, useState } from "react";
import { buildSmoothPath } from "@/lib/chart-utils";
import { cn } from "@/lib/utils";

type MasternodesChartProps = {
  data: { date: string; count: number }[];
  className?: string;
};

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MasternodesChart({ data, className }: MasternodesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId();

  if (data.length < 2) {
    return (
      <div
        className={cn(
          "flex h-[112px] w-full items-center justify-center rounded-[20px] text-sm text-muted-foreground",
          className,
        )}
      >
        No historical data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 28;
  const width = 700;
  const height = 112;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const magnitude = 10 ** Math.floor(Math.log10(maxCount || 1));
  const step = magnitude < 1 ? 1 : magnitude <= 5 ? magnitude : magnitude / 2;
  const niceMax = Math.ceil(maxCount / step) * step || 1;
  const yTicks = [
    0,
    Math.round(niceMax / 3),
    Math.round((niceMax * 2) / 3),
    niceMax,
  ];

  const points = data.map((entry, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (entry.count / niceMax) * chartHeight;
    return { x, y, ...entry };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L${points[points.length - 1].x},${paddingTop + chartHeight} L${points[0].x},${paddingTop + chartHeight} Z`;

  const labelInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className={cn("relative w-full rounded-[20px]", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Masternodes chart"
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
                fontSize="9"
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
            key={p.date}
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
              key={`label-${p.date}`}
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="9"
            >
              {formatDateLabel(p.date)}
            </text>
          );
        })}

        {points.map((p, i) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: SVG hover zones
          <rect
            key={`hover-${p.date}`}
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
          <div className="font-semibold text-[#21314d]">
            {points[hoveredIndex].count.toLocaleString()} Nodes
          </div>
          <div className="mt-0.5 text-[#7f8da8]">
            {formatDateLabel(points[hoveredIndex].date)}
          </div>
        </div>
      )}
    </div>
  );
}
