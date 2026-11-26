import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useClockValue } from "@/components/render-clock";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { proposalVotesChartQueryOptions } from "@/lib/api/governance";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Network } from "@/lib/store";
import { fundingVoteSeries as series } from "@/themes/dash/lib/funding-vote-series";
import { ChartDateRange, type ChartPeriod } from "./chart-date-range";
import { DaoHint } from "./dao-hint";

const DAY = 86_400_000;

export function ProposalVoteHistory({
  hash,
  network,
}: {
  hash: string;
  network: Network;
}) {
  const today = useClockValue((now) => Math.floor(now / DAY) * DAY);
  const [period, setPeriod] = useState<ChartPeriod>({ days: 30 });
  const end = period.end ?? today;
  const hourly = period.days === 1;
  const query = useQuery(
    proposalVotesChartQueryOptions({
      network,
      hash,
      timestampStart: new Date(end - period.days * DAY).toISOString(),
      timestampEnd: new Date(end).toISOString(),
      intervalsCount: hourly ? 24 : period.days,
      runningTotal: false,
    }),
  );
  const data = query.data ?? undefined;
  const tickCount = Math.min(data?.length ?? 0, 5);
  const ticks =
    data &&
    Array.from(
      { length: tickCount },
      (_, index) =>
        data[
          Math.round((index * (data.length - 1)) / Math.max(1, tickCount - 1))
        ].timestamp,
    );
  const count = data?.length
    ? data.reduce(
        (sum, { data: votes }) => sum + votes.yes + votes.no + votes.abstain,
        0,
      )
    : null;
  return (
    <section
      aria-label="Weighted votes over time"
      className="min-w-0 rounded-3xl border border-border bg-card px-3 py-3 shadow-[var(--card-shadow)] sm:px-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-1">
        <h2 className="inline-flex items-baseline gap-1 text-sm text-muted-foreground sm:gap-2">
          Votes
          {count != null && (
            <DaoHint description="Weighted funding votes in the selected period, not the number of masternodes.">
              <strong className="tabular-nums text-foreground">
                {formatNumber(count)}
              </strong>
            </DaoHint>
          )}
        </h2>
        <ChartDateRange value={period} today={today} onChange={setPeriod} />
      </header>
      {data && count != null && count > 0 ? (
        <ChartContainer
          config={series}
          className="mt-1 h-28 w-full aspect-auto lg:h-[104px]"
        >
          <BarChart
            accessibilityLayer
            title="Weighted funding votes by interval. Use the left and right arrow keys to explore."
            data={data}
            margin={{ top: 4, left: 0, right: 8, bottom: 0 }}
            maxBarSize={28}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.65}
            />
            <XAxis
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              ticks={ticks}
              interval="preserveStartEnd"
              height={18}
              minTickGap={46}
              tickMargin={3}
              tickFormatter={(value) =>
                formatDateTime(
                  value,
                  hourly
                    ? { hour: "2-digit", hourCycle: "h23", minute: "2-digit" }
                    : { month: "short", day: "numeric" },
                )
              }
            />
            <YAxis
              allowDecimals={false}
              tickCount={3}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <ChartTooltip
              cursor={{ fill: "var(--action-subtle)" }}
              content={(props) => (
                <div aria-live="polite" aria-atomic="true">
                  <ChartTooltipContent
                    {...props}
                    labelFormatter={(_, payload) => {
                      const stamp = payload[0]?.payload.timestamp;
                      return stamp
                        ? formatDateTime(stamp, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            ...(hourly
                              ? ({
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZoneName: "short",
                                } as const)
                              : {}),
                          })
                        : "";
                    }}
                  />
                </div>
              )}
            />
            {Object.entries(series).map(([key, item]) => (
              <Bar
                key={key}
                dataKey={`data.${key}`}
                name={item.label}
                stackId="votes"
                fill={item.color}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartContainer>
      ) : (
        <output className="mt-1 grid h-28 place-content-center text-sm text-muted-foreground lg:h-[104px]">
          {query.isError ? (
            <button
              type="button"
              className="underline"
              onClick={() => void query.refetch()}
            >
              Could not load history. Retry
            </button>
          ) : query.isPending ? (
            "Loading history…"
          ) : data == null ? (
            "History unavailable."
          ) : (
            "No funding votes in this range."
          )}
        </output>
      )}
    </section>
  );
}
