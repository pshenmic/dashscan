import { useQuery } from "@tanstack/react-query";
import { ChartLine } from "lucide-react";
import { useId, useState } from "react";
import { Pie, PieChart } from "recharts";
import { useClockValue } from "@/components/render-clock";
import {
  chainHistoryQueryOptions,
  transactionsBreakdown24hQueryOptions,
} from "@/lib/api/stats";
import { homeChainQueryOptions } from "@/lib/home";
import type { Network } from "@/lib/store";
import {
  metricDuffs,
  metricDuffsCompact,
  metricNumber,
} from "@/themes/dash/lib/home-metrics";
import { ChainHistoryChart } from "./chain-history-chart";
import { ChartDateRange, type ChartPeriod } from "./chart-date-range";
import { InfoPopover } from "./info-popover";
import { SkeletonBar } from "./skeleton";
import { TransactionHistoryPanel } from "./transaction-history-panel";
export function TransactionsOverview({ network }: { network: Network }) {
  const titleId = useId();
  const chain = useQuery(homeChainQueryOptions(network));
  const today = useClockValue(
    (now) => Math.floor(now / 86_400_000) * 86_400_000,
  );
  const [period, setPeriod] = useState<ChartPeriod>({ days: 30 });
  const end = period.end ?? today;
  const hourly = period.days === 1;
  const fees = useQuery(
    chainHistoryQueryOptions({
      network,
      timestampStart: new Date(end - period.days * 86_400_000).toISOString(),
      timestampEnd: new Date(end).toISOString(),
      intervalsCount: hourly ? 24 : period.days,
    }),
  );
  const breakdown = useQuery({
    ...transactionsBreakdown24hQueryOptions({ network }),
    refetchInterval: 60_000,
  });
  const total = breakdown.data?.total;
  const special = breakdown.data?.special;
  const validComposition =
    total != null &&
    special != null &&
    total >= 0 &&
    special >= 0 &&
    special <= total;
  const slices = validComposition
    ? [
        { name: "Standard", count: total - special, fill: "var(--chart-1)" },
        { name: "Special", count: special, fill: "var(--chart-5)" },
      ]
    : [];
  const surface = "rounded-3xl dash-home-panel px-4 py-4 sm:px-5";
  return (
    <section
      aria-labelledby={titleId}
      className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
    >
      <div className="flex min-w-0 flex-col gap-6 xl:grid xl:grid-rows-[auto_1fr_auto]">
        <div>
          <h1 id={titleId} className="dash-heading-page sm:dash-heading-hero">
            <span className="font-extrabold text-brand">Transactions</span>{" "}
            Stats
          </h1>
        </div>
        <div>
          <TransactionHistoryPanel network={network} title="Confirmed" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="relative grid min-w-0 grid-cols-2 gap-4 xl:shrink-0">
          <div
            className={`${surface} relative z-10 flex items-baseline justify-between gap-3 self-end justify-self-start`}
          >
            <h2 className="text-sm font-medium text-muted-foreground">
              <InfoPopover label="Mempool" trigger="Mempool">
                Transactions in this node’s mempool, not yet included in a
                block.
              </InfoPopover>
            </h2>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {chain.isPending ? (
                <SkeletonBar className="w-16" />
              ) : (
                metricNumber(chain.data?.mempoolSize, 0)
              )}
            </p>
          </div>
          <div className={`${surface} relative z-10 justify-self-end`}>
            <h2 className="text-sm font-medium text-muted-foreground">
              <InfoPopover label="Current TPS" trigger="Current TPS">
                Average transaction rate over the latest 20 blocks.
              </InfoPopover>
            </h2>
            <div className="mt-2 flex items-baseline justify-between gap-3 whitespace-nowrap">
              <p className="text-xl font-semibold tabular-nums text-foreground">
                {metricNumber(chain.data?.transactionsPerSecond)}{" "}
                {chain.data?.transactionsPerSecond != null && (
                  <span className="font-medium text-muted-foreground">
                    Tx/s
                  </span>
                )}
              </p>
              <span className="text-xs text-muted-foreground">20 blocks</span>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-5 rounded-3xl dash-home-panel p-4 sm:flex-row sm:p-5">
          <div className="relative size-[174px] shrink-0">
            <div aria-hidden="true">
              {validComposition && total > 0 ? (
                <PieChart width={174} height={174} accessibilityLayer={false}>
                  <Pie
                    data={slices}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={59}
                    outerRadius={86}
                    startAngle={90}
                    endAngle={-270}
                    cornerRadius={4}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                    rootTabIndex={-1}
                  />
                </PieChart>
              ) : (
                <div className="size-full rounded-full border-[26px] border-secondary" />
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <strong className="text-xl tabular-nums">
                {metricNumber(total, 0)}
              </strong>
            </div>
          </div>
          <div className="w-full min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                <InfoPopover
                  label="About transaction composition"
                  trigger="Transaction types"
                >
                  Confirmed transactions in the last 24 hours. CoinJoin and
                  multisig are overlapping attributes, not additional chart
                  slices.
                </InfoPopover>
              </h2>
              <span className="rounded-lg bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                24H
              </span>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              {slices.map((slice) => (
                <div
                  key={slice.name}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="flex shrink-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: slice.fill }}
                    />
                    {slice.name}
                  </dt>
                  <dd className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-right tabular-nums">
                    <span className="font-extrabold">
                      {metricNumber(slice.count, 0)}
                    </span>
                    <span className="w-[6ch] font-medium text-muted-foreground">
                      {total
                        ? `${metricNumber((slice.count / total) * 100, 1)}%`
                        : ""}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-xs font-medium text-muted-foreground">
                Attributes
              </h3>
              <dl className="mt-3 space-y-3 text-sm">
                {(["coinjoin", "multisig"] as const).map((key) => (
                  <div
                    key={key}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <dt>{key === "coinjoin" ? "CoinJoin" : "Multisig"}</dt>
                    <dd className="text-right font-extrabold tabular-nums">
                      {metricNumber(breakdown.data?.[key], 0)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
        <div className="isolate grid min-w-0 gap-2 sm:gap-0 xl:mt-auto">
          <div className="relative z-10 grid gap-2 sm:flex sm:flex-wrap sm:justify-center">
            {[
              {
                label: "Avg/tx · 24H",
                value: metricDuffsCompact(breakdown.data?.averageFee),
                exact: metricDuffs(breakdown.data?.averageFee),
                description:
                  "Average across transactions with a known fee in the last 24 hours, excluding coinbase.",
              },
              {
                label: "Total fees · 24H",
                value: metricDuffsCompact(breakdown.data?.fees),
                exact: metricDuffs(breakdown.data?.fees),
                description:
                  "Total known transaction fees in the last 24 hours, excluding coinbase.",
              },
            ].map((metric) => (
              <dl
                key={metric.label}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-2xl border border-border bg-card px-4 py-2 shadow-[var(--card-shadow)]"
              >
                <dt className="text-sm font-medium text-muted-foreground">
                  <InfoPopover label={metric.label} trigger={metric.label}>
                    {metric.description}
                    {metric.exact !== "—" && (
                      <p className="mt-2 font-medium tabular-nums">
                        {metric.exact} DASH
                      </p>
                    )}
                  </InfoPopover>
                </dt>
                <dd className="whitespace-nowrap font-semibold tabular-nums">
                  {breakdown.isPending ? (
                    <SkeletonBar className="w-24" />
                  ) : (
                    <span className="inline-flex items-baseline gap-x-1 whitespace-nowrap">
                      {metric.value}{" "}
                      {metric.value !== "—" && (
                        <span className="text-xs font-medium text-muted-foreground">
                          DASH
                        </span>
                      )}
                    </span>
                  )}
                </dd>
              </dl>
            ))}
          </div>
          <figure
            className={
              "flex min-w-0 flex-col gap-2 rounded-3xl dash-home-panel p-4 sm:-mt-3 sm:p-5 sm:pt-7"
            }
          >
            <figcaption className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                <span className="flex size-8 items-center justify-center rounded-full bg-action-subtle text-accent">
                  <ChartLine
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.75}
                  />
                </span>
                Fees
              </span>
              <ChartDateRange
                value={period}
                today={today}
                onChange={setPeriod}
              />
            </figcaption>
            <ChainHistoryChart
              data={fees.data}
              metric="fees"
              label={
                hourly ? "Hourly transaction fees" : "Daily transaction fees"
              }
              hourlyAxis={hourly}
              formatValue={(value) => `${metricDuffs(value)} DASH`}
              loading={fees.isPending}
              error={fees.isError}
              onRetry={() => void fees.refetch()}
              height={156}
              chartAxes
            />
          </figure>
        </div>
      </div>
      {(chain.isError || breakdown.isError) && (
        <p role="alert" className="text-sm text-destructive xl:col-span-2">
          Could not refresh transaction statistics.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void chain.refetch();
              void breakdown.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
    </section>
  );
}
