import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiAddressBalanceEntry } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const chartConfig: ChartConfig = {
  value: { label: "Share", color: "var(--accent)" },
};

function sliceColor(index: number, total: number) {
  if (total <= 1) return "var(--accent)";
  const t = index / Math.max(1, total - 1);
  const opacity = Math.round((1 - t * 0.62) * 100);
  return `color-mix(in oklab, var(--accent) ${opacity}%, transparent)`;
}

function formatPct(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value < 0.01) return `${value.toFixed(4)}%`;
  if (value < 1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(2)}%`;
}

function StatPill({
  label,
  value,
  highlight,
  swatch,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  swatch?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 min-w-[88px] flex-col gap-1 rounded-md border border-border/60 bg-card/60 px-3 py-2 transition-colors",
        highlight && "border-accent/40 bg-accent/[0.06]",
      )}
    >
      <div className="flex items-center gap-1.5">
        {swatch && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: swatch }}
          />
        )}
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "font-mono text-base font-semibold tabular-nums leading-none",
          highlight ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function ConcentrationBanner({
  entries,
  isLoading,
}: {
  entries: ApiAddressBalanceEntry[];
  isLoading: boolean;
}) {
  const { topEntries, othersEntry, top1, top3, top10, distribution } =
    useMemo(() => {
      const top = entries.filter((e) => e.address !== "others");
      const others = entries.find((e) => e.address === "others") ?? null;
      const conc = (e: ApiAddressBalanceEntry) =>
        e.concentration != null ? Number(e.concentration) : 0;
      const sum = (arr: ApiAddressBalanceEntry[]) =>
        arr.reduce((acc, e) => acc + conc(e), 0);
      const top1Sum = top.slice(0, 1).length ? sum(top.slice(0, 1)) : 0;
      const top3Sum = top.slice(0, 3).length ? sum(top.slice(0, 3)) : 0;
      const top10Sum = top.slice(0, 10).length ? sum(top.slice(0, 10)) : 0;

      const t1 = sum(top.slice(0, 1));
      const t2to3 = sum(top.slice(1, 3));
      const t4to10 = sum(top.slice(3, 10));
      const othersPct =
        others != null ? conc(others) : Math.max(0, 100 - top10Sum);

      return {
        topEntries: top,
        othersEntry: others,
        top1: top1Sum,
        top3: top3Sum,
        top10: top10Sum,
        distribution: { t1, t2to3, t4to10, others: othersPct },
      };
    }, [entries]);

  const pieData = useMemo(() => {
    const slices = topEntries.map((entry, idx) => ({
      key: entry.address ?? `top-${idx}`,
      label: `#${idx + 1}`,
      value: entry.concentration != null ? Number(entry.concentration) : 0,
      color: sliceColor(idx, topEntries.length),
    }));
    const othersValue =
      othersEntry?.concentration != null
        ? Number(othersEntry.concentration)
        : Math.max(0, 100 - top10);
    slices.push({
      key: "others",
      label: "Others",
      value: othersValue,
      color: "color-mix(in oklab, var(--muted-foreground) 22%, transparent)",
    });
    return slices.filter((s) => s.value > 0);
  }, [topEntries, othersEntry, top10]);

  if (isLoading) {
    return (
      <div className="mb-4 flex flex-col gap-5 border-b border-border/50 pb-5 sm:flex-row sm:items-stretch">
        <Skeleton className="mx-auto size-40 shrink-0 rounded-full sm:mx-0" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      </div>
    );
  }

  if (pieData.length === 0) return null;

  const segments = [
    { label: "Top 1", value: distribution.t1, color: "var(--accent)" },
    {
      label: "Top 2-3",
      value: distribution.t2to3,
      color: "color-mix(in oklab, var(--accent) 65%, transparent)",
    },
    {
      label: "Top 4-10",
      value: distribution.t4to10,
      color: "color-mix(in oklab, var(--accent) 38%, transparent)",
    },
    {
      label: "Others",
      value: distribution.others,
      color: "color-mix(in oklab, var(--muted-foreground) 22%, transparent)",
    },
  ];
  const distroTotal = segments.reduce((acc, s) => acc + s.value, 0) || 1;

  return (
    <div className="mb-4 flex flex-col gap-5 border-b border-border/50 pb-5 sm:flex-row sm:items-stretch">
      <div className="relative mx-auto size-40 shrink-0 sm:mx-0">
        <ChartContainer config={chartConfig} className="aspect-square size-40">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={1.5}
              stroke="var(--background)"
              strokeWidth={2}
              isAnimationActive
              animationDuration={650}
            >
              {pieData.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden
        >
          <span className="font-display-num text-2xl tabular-nums leading-none text-accent">
            {formatPct(top10)}
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Top 10 share
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3">
        <div>
          <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Concentration
          </h4>
          <p className="mt-1 text-sm text-foreground">
            Top 10 wallets control{" "}
            <span className="font-mono font-semibold tabular-nums text-accent">
              {formatPct(top10)}
            </span>{" "}
            of supply
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatPill
            label="Top 1"
            value={formatPct(top1)}
            swatch="var(--accent)"
          />
          <StatPill
            label="Top 3"
            value={formatPct(top3)}
            swatch="color-mix(in oklab, var(--accent) 65%, transparent)"
          />
          <StatPill
            label="Top 10"
            value={formatPct(top10)}
            highlight
            swatch="color-mix(in oklab, var(--accent) 38%, transparent)"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            {segments.map((seg) => {
              const pct = (seg.value / distroTotal) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={seg.label}
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, background: seg.color }}
                  title={`${seg.label}: ${formatPct(seg.value)}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {segments.map((seg) => (
              <span key={seg.label} className="inline-flex items-center gap-1">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: seg.color }}
                />
                {seg.label}
                <span className="font-mono normal-case tracking-normal text-foreground/80">
                  {formatPct(seg.value)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
