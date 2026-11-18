import { useQuery } from "@tanstack/react-query";
import { ChartLine } from "lucide-react";
import { useId, useState } from "react";
import { useClockValue } from "@/components/render-clock";
import {
  chainHistoryQueryOptions,
  transactionsBreakdown24hQueryOptions,
} from "@/lib/api/stats";
import { homeChainQueryOptions } from "@/lib/home";
import type { Network } from "@/lib/store";
import { getTxTypeLabel } from "@/lib/transaction-types";
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
  const types = validComposition
    ? [
        { name: getTxTypeLabel(0), count: total - special },
        { name: "Special", count: special },
      ]
    : [];
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
        <dl className="relative z-10 -mt-9 flex min-w-0 justify-center-safe gap-2 overflow-x-auto py-1 xl:pb-0">
          {[
            {
              label: "Mempool",
              value: metricNumber(chain.data?.mempoolSize, 0),
              loading: chain.isPending,
              description:
                "Transactions in this node’s mempool, not yet included in a block.",
            },
            {
              label: "Current TPS",
              value: metricNumber(chain.data?.transactionsPerSecond),
              unit: chain.data?.transactionsPerSecond != null ? "Tx/s" : null,
              loading: chain.isPending,
              description:
                "Average transaction rate over the latest 20 blocks.",
            },
            {
              label: "CoinJoin · 24H",
              value: metricNumber(breakdown.data?.coinjoin, 0),
              loading: breakdown.isPending,
              description:
                "Confirmed transactions identified as CoinJoin in the last 24 hours.",
            },
            {
              label: "Multisig · 24H",
              value: metricNumber(breakdown.data?.multisig, 0),
              loading: breakdown.isPending,
              description:
                "Confirmed transactions identified as multisig in the last 24 hours.",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl dash-home-panel px-2.5"
            >
              <dt className="text-sm font-medium text-muted-foreground">
                <InfoPopover label={metric.label} trigger={metric.label}>
                  {metric.description}
                </InfoPopover>
              </dt>
              <dd className="min-w-[2ch] text-right text-base font-semibold tabular-nums">
                {metric.loading ? (
                  <SkeletonBar className="w-6" />
                ) : (
                  <>
                    {metric.value}
                    {metric.unit && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {" "}
                        {metric.unit}
                      </span>
                    )}
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="@container">
          <div className="flex flex-col items-start gap-2 @[32rem]:flex-row @[32rem]:items-end">
            <div className="grid w-fit min-w-0 max-w-full shrink-0 gap-2">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <InfoPopover label="About transaction types" trigger="Types">
                  Normal (type 0) and special (nonzero type) transactions
                  confirmed in the last 24 hours.
                </InfoPopover>
                <span className="rounded-lg bg-card px-2 py-1 text-xs">
                  24H
                </span>
              </h2>

              <dl className="flex flex-wrap items-center gap-2 py-1 text-xs">
                {types.map((type) => {
                  return (
                    <div
                      key={type.name}
                      className="relative inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card px-2 py-1"
                    >
                      <dt className="font-medium text-muted-foreground">
                        {type.name}
                      </dt>
                      <dd className="flex items-baseline gap-1.5 font-semibold tabular-nums">
                        {metricNumber(type.count, 0)}
                        {total != null && total > 0 && (
                          <span className="font-medium text-muted-foreground">
                            {metricNumber((type.count / total) * 100, 1)}%
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}
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
