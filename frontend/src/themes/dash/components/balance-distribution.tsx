import { type PointerEvent, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { addressDistribution } from "@/themes/dash/lib/address-metrics";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";

export function BalanceDistribution({
  distribution,
}: {
  distribution: NonNullable<ReturnType<typeof addressDistribution>>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectSegment = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    const index =
      target instanceof Element
        ? target.getAttribute("data-balance-segment")
        : null;
    setSelected(index === null ? null : Number(index));
  };
  const labels = ["Top 1", "Top 2–5", "Top 6–10", "Other"];
  const colors = [
    "var(--brand)",
    "var(--chart-5)",
    "var(--chart-3)",
    "var(--action-subtle)",
  ];
  if (!distribution.shares || !distribution.amounts) {
    return (
      <p className="dash-body-compact text-muted-foreground">
        No unspent balance to display.
      </p>
    );
  }
  const segments = distribution.shares.map((value, index) => ({
    name: labels[index],
    value,
  }));
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
      <div
        className="shrink-0"
        aria-hidden="true"
        onPointerMove={selectSegment}
        onPointerDown={selectSegment}
        onMouseLeave={() => setSelected(null)}
      >
        <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
          {[3, 2, 1, 0].map((index) => {
            if (segments[index].value === 0) return null;
            const cumulative = segments
              .slice(0, index + 1)
              .reduce((total, segment) => total + segment.value, 0);
            return (
              <circle
                key={labels[index]}
                data-balance-segment={index}
                cx="80"
                cy="80"
                r="64"
                pathLength="100"
                fill="none"
                stroke={colors[index]}
                strokeWidth="32"
                strokeLinecap="round"
                strokeDasharray={index === 3 ? undefined : `${cumulative} 100`}
                transform="translate(160 0) scale(-1 1) rotate(-90 80 80)"
                className="motion-safe:transition-[filter] motion-safe:duration-150"
                style={{
                  filter: selected === index ? "brightness(0.9)" : undefined,
                }}
              />
            );
          })}
        </svg>
      </div>
      <div className="min-w-0 w-full flex-1 space-y-3">
        <h3 className="dash-body-compact text-foreground/50">
          Top 10 addresses
        </h3>
        <p className="text-2xl leading-8">
          <strong className="text-brand">
            {metricNumber(distribution.topTen)}%
          </strong>{" "}
          of unspent balance
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {segments.map((segment, index) => (
            <Tooltip
              key={segment.name}
              open={selected === index}
              onOpenChange={(open) => setSelected(open ? index : null)}
            >
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${segment.name}: ${metricNumber(segment.value)}%`}
                  onFocus={() => setSelected(index)}
                  onBlur={() => setSelected(null)}
                  onClick={(event) => {
                    event.preventDefault();
                    setSelected(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSelected(null);
                  }}
                  className={`min-w-0 rounded-lg bg-secondary p-2 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${selected === index ? "ring-1 ring-brand" : ""}`}
                >
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs text-foreground/50">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: colors[index] }}
                    />
                    {segment.name}
                  </span>
                  <span className="mt-1 block text-sm font-extrabold tabular-nums">
                    {metricNumber(segment.value)}%
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {segment.name} · {metricNumber(segment.value)}%
                </p>
                <p>{transactionAmount(distribution.amounts?.[index])}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}
