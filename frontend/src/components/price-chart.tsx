import { useId } from "react";
import type { ApiHistoricalEntry } from "@/lib/api/types";
import { buildSmoothPath } from "@/lib/chart-utils";
import { cn } from "@/lib/utils";

type PriceChartProps = {
  data: ApiHistoricalEntry[];
  className?: string;
  formatValue?: (value: number) => string;
};

export function PriceChart({ data, className, formatValue }: PriceChartProps) {
  const gradientId = useId();
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 600;
  const H = 192;
  const PY = 16;
  const chartW = W;
  const chartH = H - PY * 2;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * chartW,
    y: PY + chartH - ((d.value - min) / range) * chartH,
    ...d,
  }));

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`;

  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <div className={cn("flex flex-col", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-48 w-full overflow-visible"
        role="img"
        aria-label="Price chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="oklch(from var(--accent) l c h / 0.3)"
            />
            <stop
              offset="100%"
              stopColor="oklch(from var(--accent) l c h / 0)"
            />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={0}
            y1={PY + chartH * (1 - pct)}
            x2={W}
            y2={PY + chartH * (1 - pct)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p) => (
          <g key={p.timestamp} className="group">
            <circle
              cx={p.x}
              cy={p.y}
              r="12"
              fill="transparent"
              className="cursor-pointer"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r="3"
              fill="var(--accent)"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            />
            <foreignObject
              x={p.x - 50}
              y={p.y - 42}
              width="100"
              height="32"
              className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100"
            >
              <div className="flex items-center justify-center">
                <span className="rounded-md bg-foreground px-2 py-1 text-xs text-background whitespace-nowrap">
                  {fmt(p.value)}
                </span>
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between px-2">
        {data
          .filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0)
          .map((d) => (
            <span key={d.timestamp} className="text-xs text-muted-foreground">
              {new Date(d.timestamp * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ))}
      </div>
    </div>
  );
}
