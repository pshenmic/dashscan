import { useState } from "react";
import { Tooltip as ChartTooltip, Pie, PieChart } from "recharts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import type {
  PeerFacet,
  PeerSelection,
  PeerSlice,
} from "@/themes/dash/lib/network-metrics";

const colors = [
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--action-subtle)",
];
const countryLabels: Record<string, string> = {
  US: "USA",
  GB: "UK",
  AE: "UAE",
};
const hintClassName =
  "max-w-64 rounded-xl border border-border bg-popover px-3 py-2 text-left text-xs text-popover-foreground shadow-md";

function DistributionDetail({ label, count, percent }: PeerSlice) {
  return (
    <>
      <p className="font-medium">{label}</p>
      <p className="mt-1 text-muted-foreground">
        {metricNumber(count, 0)} peers · {metricNumber(percent, 1)}%
      </p>
    </>
  );
}

export function PeerDistributionCard({
  title,
  facet,
  slices,
  status,
  selectedIds,
  selection,
  onSelect,
}: {
  title: string;
  facet: PeerFacet;
  slices: PeerSlice[];
  status: string | null;
  selectedIds: Set<string> | null;
  selection: PeerSelection | null;
  onSelect: (selection: PeerSelection) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartData = slices.map((slice, index) => ({
    ...slice,
    fill: colors[index],
    fillOpacity:
      (hovered !== null && hovered !== index) ||
      (selectedIds && !slice.ids.some((id) => selectedIds.has(id)))
        ? 0.75
        : 1,
  }));
  const select = (slice: PeerSlice) => onSelect({ facet, value: slice.value });
  return (
    <div className="grid min-w-0 items-center gap-8 rounded-3xl bg-foreground/3 p-6 sm:grid-cols-[100px_minmax(0,1fr)] lg:grid-cols-1 2xl:grid-cols-[100px_minmax(0,1fr)]">
      <div
        aria-hidden="true"
        className="dash-network-pie size-[100px] shrink-0"
      >
        {!status && slices.length ? (
          <PieChart width={100} height={100} accessibilityLayer={false}>
            <Pie
              rootTabIndex={-1}
              data={chartData}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={49}
              startAngle={135}
              endAngle={495}
              paddingAngle={slices.length > 1 ? 2 : 0}
              cornerRadius={slices.length > 1 ? 4 : 0}
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, index) => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onClick={(_, index) => select(slices[index])}
              className="cursor-pointer"
            />
            <ChartTooltip
              allowEscapeViewBox={{ x: true, y: true }}
              content={({ active, payload }) => {
                const slice = payload?.[0]?.payload as PeerSlice | undefined;
                return active && slice ? (
                  <div className={hintClassName}>
                    <DistributionDetail {...slice} />
                  </div>
                ) : null;
              }}
            />
          </PieChart>
        ) : (
          <div className="size-full rounded-full bg-foreground/5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium leading-[1.1] text-foreground/50">
          {title}
        </h3>
        {status || !slices.length ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {status ?? "No peers observed"}
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {slices.map((slice, index) => {
              const selected =
                selection?.facet === facet && selection.value === slice.value;
              const button = (
                <button
                  type="button"
                  aria-label={`${slice.label}: ${metricNumber(slice.count, 0)} peers, ${metricNumber(slice.percent, 1)}%`}
                  aria-pressed={selected}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  onClick={() => select(slice)}
                  className={`flex min-h-9 w-full min-w-0 items-center gap-2 rounded-lg text-left hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "bg-action-subtle" : ""}`}
                >
                  <span
                    className="min-w-0 truncate rounded-lg px-2 py-1 text-base font-medium leading-normal tracking-[-0.009em] text-primary-foreground"
                    style={{ background: colors[index] }}
                  >
                    {facet === "country" && slice.value
                      ? (countryLabels[slice.value] ?? slice.label)
                      : slice.label}
                  </span>
                  <span
                    className={`shrink-0 font-medium leading-normal tracking-[-0.009em] tabular-nums ${selected ? "text-accent underline decoration-2 underline-offset-4" : "text-foreground/48"}`}
                  >
                    {metricNumber(slice.percent, 1)}%
                  </span>
                </button>
              );
              return (
                <li key={slice.value ?? "other-group"} className="min-w-0">
                  {slice.value === null ? (
                    <Popover>
                      <PopoverTrigger asChild>{button}</PopoverTrigger>
                      <PopoverContent
                        aria-label={`Other categories in ${title}`}
                        className={hintClassName}
                      >
                        <DistributionDetail {...slice} />
                        <ScrollArea
                          className="mt-3 rounded"
                          viewportProps={{
                            tabIndex: 0,
                            role: "region",
                            "aria-label": "Other categories",
                            className:
                              "max-h-[min(14rem,40vh)] overscroll-contain pr-3",
                          }}
                        >
                          <ul className="space-y-2">
                            {slice.groups.map((group) => (
                              <li
                                key={group.value}
                                className="flex items-start justify-between gap-4"
                              >
                                <span className="min-w-0 break-words">
                                  {group.label}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  {metricNumber(group.ids.length, 0)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent className={hintClassName}>
                        <DistributionDetail {...slice} />
                      </TooltipContent>
                    </Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

import { ScrollArea } from "@/components/ui/scroll-area";
