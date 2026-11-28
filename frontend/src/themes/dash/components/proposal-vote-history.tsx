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
  createdAt,
}: {
  hash: string;
  network: Network;
  createdAt: string | null;
}) {
  const now = useClockValue((time) => Math.floor(time / 60000) * 60000);
  const today = Math.floor(now / DAY) * DAY;
  const [selection, setSelection] = useState<ChartPeriod | null>(null);
  const created = Date.parse(createdAt ?? "");
  const hasStart = Number.isFinite(created) && created <= now;
  const all = selection == null && hasStart;
  const period = selection ?? { days: 30 };
  const end = all ? now : (period.end ?? today);
  const duration = all
    ? Math.max(1000, end - created + 1000)
    : period.days * DAY;
  const step = all
    ? Math.max(1000, Math.ceil(duration / 90 / 1000) * 1000)
    : period.days === 1
      ? DAY / 24
      : DAY;
  const intervals = Math.max(2, Math.ceil(duration / step));
  const hourly = duration <= DAY;
  const query = useQuery(
    proposalVotesChartQueryOptions({
      network,
      hash,
      timestampStart: new Date(end - intervals * step).toISOString(),
      timestampEnd: new Date(end).toISOString(),
      intervalsCount: intervals,
      runningTotal: false,
    }),
  );
  const data = query.data?.map(({ timestamp, data: votes }) => ({
    ...votes,
    timestamp: Date.parse(timestamp),
  }));
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
  const totals = data?.reduce(
    (sum, votes) => ({
      yes: sum.yes + votes.yes,
      no: sum.no + votes.no,
      abstain: sum.abstain + votes.abstain,
    }),
    { yes: 0, no: 0, abstain: 0 },
  );
  const total = totals && totals.yes + totals.no + totals.abstain;
  return (
    <section
      aria-label="Voting activity"
      className="flex min-w-0 flex-col rounded-3xl border border-border bg-card px-3 pt-4 pb-2 shadow-[var(--card-shadow)] sm:px-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col items-start">
          <h2 className="text-sm text-muted-foreground">Voting activity</h2>
          {totals && (
            <DaoHint description="Recorded weighted funding votes in the selected range, including any recorded changes of vote. This measures activity, not the current tally.">
              <strong className="text-2xl font-semibold tracking-tight tabular-nums text-brand sm:text-3xl">
                {formatNumber(totals.yes)} Yes
              </strong>
            </DaoHint>
          )}
          {totals && (
            <div className="mt-1 flex flex-wrap gap-1 text-xs tabular-nums text-muted-foreground [&>span]:rounded-md [&>span]:bg-secondary [&>span]:px-2 [&>span]:py-0.5">
              <span>{formatNumber(totals.abstain)} Abstain</span>
              <span>{formatNumber(totals.no)} No</span>
            </div>
          )}
        </div>
        <ChartDateRange
          value={period}
          today={today}
          onChange={setSelection}
          allSelected={all}
          onSelectAll={hasStart ? () => setSelection(null) : undefined}
        />
      </header>
      {data && total != null && total > 0 ? (
        <ChartContainer
          config={series}
          className="mt-4 h-56 w-full flex-1 aspect-auto min-h-56"
        >
          <BarChart
            maxBarSize={28}
            accessibilityLayer
            title="Recorded weighted Yes, No and Abstain votes per interval. Use the arrow keys for exact vote counts."
            data={data}
            margin={{ top: 8, left: 0, right: 4, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="2 3"
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
              height={30}
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
              domain={[0, "auto"]}
              allowDecimals={false}
              tickCount={3}
              axisLine={false}
              tickLine={false}
              width="auto"
            />
            <ChartTooltip
              cursor={{ fill: "var(--action-subtle)" }}
              content={(props) => (
                <div aria-live="polite" aria-atomic="true">
                  <ChartTooltipContent
                    {...props}
                    labelFormatter={(_, payload) => {
                      const stamp = payload[0]?.payload.timestamp;
                      if (stamp == null) return "";
                      if (all || hourly) {
                        const options = {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hourCycle: "h23",
                        } as const;
                        return `${formatDateTime(stamp, options)} – ${formatDateTime(stamp + step, options)} UTC`;
                      }
                      return formatDateTime(stamp, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                  />
                </div>
              )}
            />
            {Object.entries(series).map(([key, item]) => (
              <Bar
                key={key}
                dataKey={key}
                name={item.label}
                stackId="votes"
                fill={item.color}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartContainer>
      ) : (
        <output className="mt-4 grid min-h-56 flex-1 place-content-center text-sm text-muted-foreground">
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
