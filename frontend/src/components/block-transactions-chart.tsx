import { cn } from "@/lib/utils";
import { useState } from "react";

type BlockTransactionsChartProps = {
  data: { height: number; txCount: number }[];
  className?: string;
};

export function BlockTransactionsChart({
  data,
  className,
}: BlockTransactionsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => a.height - b.height);
  const maxCount = Math.max(...sorted.map((d) => d.txCount), 1);

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 28;
  const width = 700;
  const height = 112;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const niceMax = Math.ceil(maxCount / 50) * 50 || 50;
  const yTicks = [
    0,
    Math.round(niceMax / 3),
    Math.round((niceMax * 2) / 3),
    niceMax,
  ];

  const points = sorted.map((entry, i) => {
    const x = paddingLeft + (i / (sorted.length - 1)) * chartWidth;
    const y =
      paddingTop + chartHeight - (entry.txCount / niceMax) * chartHeight;
    return { x, y, ...entry };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${paddingTop + chartHeight} L${points[0].x},${paddingTop + chartHeight} Z`;

  const labelInterval = Math.max(1, Math.floor(sorted.length / 8));

  return (
    <div className={cn("relative w-full rounded-[20px]", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="oklch(from var(--accent) l c h)"
              stopOpacity="0.12"
            />
            <stop
              offset="100%"
              stopColor="oklch(from var(--accent) l c h)"
              stopOpacity="0.02"
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

        <path d={areaPath} fill="url(#areaGradient)" />
        <path
          d={linePath}
          fill="none"
          stroke="oklch(from var(--accent) l c h)"
          strokeWidth="1.5"
        />

        {points.map((p, i) => (
          <circle
            key={p.height}
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
          if (i % labelInterval !== 0 && i !== sorted.length - 1) return null;
          return (
            <text
              key={p.height}
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="9"
            >
              #{p.height}
            </text>
          );
        })}

        {points.map((p, i) => (
          <rect
            key={`hover-${p.height}`}
            x={p.x - chartWidth / sorted.length / 2}
            y={paddingTop}
            width={chartWidth / sorted.length}
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
            {points[hoveredIndex].txCount} TXs
          </div>
          <div className="mt-0.5 text-[#7f8da8]">
            #{points[hoveredIndex].height}
          </div>
        </div>
      )}
    </div>
  );
}
