import { useState } from "react";
import { Tooltip as ChartTooltip, Pie, PieChart } from "recharts";
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
  const [hovered, setHovered] = useState<number | null>(null);
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
    fill: colors[index],
    fillOpacity:
      (hovered ?? selected) != null && (hovered ?? selected) !== index
        ? 0.75
        : 1,
    amount: distribution.amounts?.[index],
  }));
  const multipleSegments =
    segments.filter((segment) => segment.value > 0).length > 1;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
      <div
        className="size-40 shrink-0"
        aria-hidden="true"
        onMouseLeave={() => setHovered(null)}
      >
        <PieChart width={160} height={160} accessibilityLayer={false}>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={54}
            outerRadius={79}
            startAngle={90}
            endAngle={-270}
            cornerRadius={multipleSegments ? 4 : 0}
            paddingAngle={multipleSegments ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
            rootTabIndex={-1}
            onMouseEnter={(_, index) => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          />
          <ChartTooltip
            allowEscapeViewBox={{ x: true, y: true }}
            content={({ active, payload }) => {
              const segment = payload?.[0]?.payload as
                | (typeof segments)[number]
                | undefined;
              return active && segment ? (
                <div className="max-w-64 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <p>
                    {segment.name} · {metricNumber(segment.value)}%
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {transactionAmount(segment.amount)}
                  </p>
                </div>
              ) : null;
            }}
          />
        </PieChart>
      </div>
      <div className="min-w-0 w-full flex-1 space-y-3">
        <h3 className="dash-body-compact text-muted-foreground">
          Top 10 addresses
        </h3>
        <p className="text-2xl leading-8">
          <strong className="text-accent">
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
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
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
              <TooltipContent className="max-w-64 rounded-xl border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
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
