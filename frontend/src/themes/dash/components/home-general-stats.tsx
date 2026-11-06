import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useId } from "react";
import { marketCapQueryOptions } from "@/lib/api/marketcap";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import { transactionsBreakdown24hQueryOptions } from "@/lib/api/stats";
import { formatDateTime, formatHashRate, formatNumber } from "@/lib/format";
import { homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  percentageChange,
  useHistoryRange,
  useHomeChainHistory,
} from "@/themes/dash/lib/home-history";
import {
  estimatedSupply,
  historyChange,
  metricNumber,
  sortedHistory,
} from "@/themes/dash/lib/home-metrics";
import { AreaChart } from "./area-chart";
import { ChainHistoryChart } from "./chain-history-chart";
import { MissingApiData } from "./missing-api-data";

function StatCard({
  label,
  value,
  detail,
  children,
  className = "",
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "dash-home-panel flex min-w-0 items-center justify-between gap-6 rounded-3xl px-6 py-4",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <h3 className="dash-body-compact text-muted-foreground">{label}</h3>
        <p className="dash-metric break-words text-accent">{value}</p>
        <div className="dash-label-small text-muted-foreground">{detail}</div>
      </div>
      {children}
    </div>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <span
      className={
        value >= 0
          ? "font-extrabold text-success"
          : "font-extrabold text-destructive"
      }
    >
      {value > 0 ? "↑" : value < 0 ? "↓" : ""}
      {metricNumber(Math.abs(value))}%
    </span>
  );
}

function priceChartDate(timestamp: number) {
  const date = timestamp * 1000;
  return `${formatDateTime(date, { day: "2-digit" })}.${formatDateTime(date, { month: "2-digit" })}`;
}

export function HomeGeneralStats() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const chain = useQuery(homeChainQueryOptions(network));
  const chainHistory = useHomeChainHistory(network);
  const rateRange = useHistoryRange(1);
  const breakdown = useQuery(
    transactionsBreakdown24hQueryOptions({
      network,
      timestampStart: rateRange.timestampStart,
      timestampEnd: rateRange.timestampEnd,
    }),
  );
  const previousBreakdown = useQuery(
    transactionsBreakdown24hQueryOptions({
      network,
      timestampStart: new Date(
        Date.parse(rateRange.timestampStart) - 86_400_000,
      ).toISOString(),
      timestampEnd: rateRange.timestampStart,
    }),
  );
  const rateChange = percentageChange(
    breakdown.data?.total,
    previousBreakdown.data?.total,
  );
  const price = useQuery(priceQueryOptions({ network, currency: "usd" }));
  const history = useQuery(
    priceHistoricalQueryOptions({ network, currency: "usd" }),
  );
  const marketCap = useQuery(
    marketCapQueryOptions({ network, currency: "usd" }),
  );
  const stats = chain.data;
  const [hashRateValue, hashRateUnit] = formatHashRate(stats?.hashRate).split(
    " ",
  );
  const [peakHashRateValue, peakHashRateUnit] = formatHashRate(
    stats?.peakHashRate,
  ).split(" ");
  const priceHistory = sortedHistory(history.data);
  const supply = estimatedSupply(marketCap.data?.usd, price.data?.usd);
  const firstPrice = priceHistory[0];
  const lastPrice = priceHistory.at(-1);
  const difficulty = stats?.difficulty;
  const difficultyScale =
    difficulty != null && difficulty >= 1_000_000
      ? 1_000_000
      : difficulty != null && difficulty >= 1_000
        ? 1_000
        : 1;
  const difficultyUnit =
    difficultyScale === 1_000_000 ? "M" : difficultyScale === 1_000 ? "K" : "";

  return (
    <section
      aria-labelledby={titleId}
      className="@container/overview space-y-6"
    >
      <h2 id={titleId} className="text-xl font-medium text-muted-foreground">
        Overview
      </h2>
      {chain.isError && (
        <p role="alert" className="dash-body-compact text-destructive">
          Network statistics are unavailable.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void chain.refetch()}
          >
            Try again
          </button>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 @min-[80rem]/overview:grid-cols-[minmax(250px,1.5fr)_minmax(224px,1fr)_minmax(346px,1.7fr)_232px_minmax(200px,1fr)]">
        <StatCard
          label="Dash Price (USD)"
          value={
            price.data?.usd != null ? `$${metricNumber(price.data.usd)}` : "—"
          }
          detail={
            <span className="flex flex-wrap items-center gap-1">
              <span className="rounded-lg bg-secondary px-2 py-1">
                {firstPrice && lastPrice
                  ? "24H"
                  : price.isPending
                    ? "Loading…"
                    : "USD"}
              </span>
              <Change value={historyChange(priceHistory)} />
            </span>
          }
          className="sm:col-span-2 xl:col-span-1"
        >
          <div className="min-w-24 flex-1">
            {priceHistory.length > 1 && firstPrice && lastPrice ? (
              <>
                <AreaChart
                  compact
                  data={priceHistory}
                  getValue={(entry) => entry.value}
                  getKey={(entry) => entry.timestamp}
                  getXLabel={(entry) => formatDateTime(entry.timestamp * 1000)}
                  renderTooltip={(entry) => (
                    <>
                      <p className="font-extrabold">
                        ${metricNumber(entry.value)}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDateTime(entry.timestamp * 1000)}
                      </p>
                    </>
                  )}
                  formatYLabel={(value) => `$${metricNumber(value)}`}
                  ariaLabel="Dash price history in USD over the last day"
                  minimumMax={0}
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{priceChartDate(firstPrice.timestamp)}</span>
                  <span>{priceChartDate(lastPrice.timestamp)}</span>
                </div>
              </>
            ) : (
              <p className="dash-label-small text-muted-foreground">
                {history.isPending
                  ? "Loading chart…"
                  : "Price history unavailable"}
              </p>
            )}
          </div>
        </StatCard>
        <StatCard
          label="Estimated Supply"
          value={
            supply === null ? (
              "—"
            ) : (
              <span className="whitespace-nowrap">
                {formatNumber(supply / 1_000_000, {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}
                <span className="whitespace-nowrap font-medium">M DASH</span>
              </span>
            )
          }
          detail={
            <span
              className="inline-flex rounded-lg bg-secondary px-2 py-1"
              title="Estimated from market capitalization divided by the USD price."
            >
              {supply === null
                ? "Estimate unavailable"
                : `≈ ${metricNumber(supply, 0)} DASH`}
            </span>
          }
        />
        <StatCard
          label="Network Hashrate"
          value={
            <span
              className="whitespace-nowrap text-base tabular-nums @[18rem]:text-2xl"
              title="Estimated network hash rate over the last 120 indexed blocks."
            >
              {hashRateValue}
              {hashRateUnit && (
                <span className="whitespace-nowrap font-medium">
                  {" "}
                  {hashRateUnit}
                </span>
              )}
            </span>
          }
          detail={
            <span className="flex flex-wrap items-center gap-1">
              <span className="rounded-lg bg-secondary px-2 py-1">Block</span>
              {stats?.latestHeight != null ? (
                <Link
                  to="/blocks/$hashOrHeight"
                  params={{ hashOrHeight: String(stats.latestHeight) }}
                  className="rounded font-extrabold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  #{metricNumber(stats.latestHeight, 0)}
                </Link>
              ) : (
                <span>—</span>
              )}
            </span>
          }
          className="@container grid grid-cols-[minmax(0,1fr)_max-content] gap-3 px-4 sm:px-6"
        >
          <div className="relative aspect-[178/84] w-[140px] shrink-0 @[24rem]:w-[178px]">
            <img
              src="/icons/home/hashrate-gauge-track.svg"
              alt=""
              width={116}
              height={81}
              className="pointer-events-none absolute left-[34%] top-0 h-[96.4%] w-[65%]"
            />
            <img
              src="/icons/home/hashrate-gauge-accent.svg"
              alt=""
              width={55}
              height={76}
              className="pointer-events-none absolute left-0 top-[7.1%] h-[90.5%] w-[31%]"
            />
            <p
              className="absolute inset-x-2 top-[39%] whitespace-nowrap text-center text-lg font-extrabold leading-6 text-accent @[24rem]:text-xl"
              title={
                stats?.peakHashRateTimestamp
                  ? `Highest daily average · ${formatDateTime(stats.peakHashRateTimestamp)}`
                  : "Highest daily average in indexed history"
              }
            >
              {peakHashRateValue}{" "}
              <span className="font-normal">{peakHashRateUnit}</span>
            </p>
            <p className="absolute inset-x-0 top-[75%] text-center text-[10px] font-medium text-muted-foreground @[24rem]:text-xs">
              Peak daily average
            </p>
            {stats?.peakHashRate == null && (
              <div className="absolute inset-x-0 top-8 flex justify-center bg-card">
                <MissingApiData
                  compact
                  description="The highest daily average hashrate for the selected network is not available."
                />
              </div>
            )}
          </div>
        </StatCard>
        <StatCard
          label="Pending Transactions"
          value={
            <span title="Number of pending transactions currently indexed.">
              {metricNumber(stats?.mempoolSize, 0)}{" "}
              <span className="font-medium">Txs</span>
            </span>
          }
          detail={
            <span className="inline-flex rounded-lg bg-secondary px-2 py-1">
              Indexed mempool
            </span>
          }
        />
        <StatCard
          label="Current TPS"
          value={
            <span title="Average transactions per second over the last 20 indexed blocks.">
              {metricNumber(stats?.transactionsPerSecond)}{" "}
              <span className="font-medium">Tx/s</span>
            </span>
          }
          detail={
            <div className="flex flex-wrap items-center gap-1">
              <span className="rounded-lg bg-secondary px-2 py-1">24H</span>
              {breakdown.isPending || previousBreakdown.isPending ? (
                <output aria-label="Loading TPS comparison">…</output>
              ) : breakdown.isError || previousBreakdown.isError ? (
                <button
                  type="button"
                  className="text-destructive underline"
                  aria-label="Retry TPS comparison"
                  onClick={() => {
                    void breakdown.refetch();
                    void previousBreakdown.refetch();
                  }}
                >
                  Retry
                </button>
              ) : rateChange != null ? (
                <span
                  title={`Change in average confirmed TPS between two consecutive 24-hour periods, ending ${formatDateTime(rateRange.timestampEnd)}. Not a change in the current 20-block estimate.`}
                >
                  <Change value={rateChange} />
                </span>
              ) : previousBreakdown.data?.total === 0 ? (
                <span title="Percentage change is undefined because the previous 24-hour period has no confirmed transactions.">
                  —
                </span>
              ) : (
                <MissingApiData
                  inline
                  description="Transaction totals for both consecutive 24-hour periods are required to compare average TPS."
                />
              )}
            </div>
          }
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="dash-home-panel flex min-w-0 flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:gap-12">
          <div className="min-w-0 space-y-2 sm:max-w-[48%]">
            <h3 className="text-base font-medium leading-4">
              Hashrate History
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p
                className="whitespace-nowrap text-[32px] font-extrabold leading-[1.0813]"
                title="Current hashrate estimate over the last 120 indexed blocks. The chart shows daily averages."
              >
                {hashRateValue}
                {hashRateUnit && (
                  <span className="text-base font-medium"> {hashRateUnit}</span>
                )}
              </p>
              <MissingApiData
                inline
                description="Month-over-month hashrate change is not available yet."
              />
            </div>
            <p className="text-sm font-medium leading-4 text-muted-foreground">
              Daily averages · 30 days
            </p>
          </div>
          <div className="min-w-0 w-full sm:flex-1">
            <div className="flex items-center justify-center">
              <ChainHistoryChart
                data={chainHistory.data}
                metric="hashRate"
                label="Historical hashrate · 30 days"
                detailedAxis
                formatValue={(value) => formatHashRate(String(value))}
                loading={chainHistory.isPending}
                error={chainHistory.isError}
                onRetry={() => void chainHistory.refetch()}
              />
            </div>
          </div>
        </div>
        <div className="dash-home-panel flex min-w-0 flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:gap-12">
          <div className="min-w-0 shrink-0 space-y-2 sm:max-w-[45%]">
            <h3 className="text-base font-medium leading-4">
              Mining Difficulty
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <p
                className="whitespace-nowrap text-[32px] font-extrabold leading-[1.0813]"
                title={metricNumber(difficulty)}
              >
                {metricNumber(
                  difficulty == null ? null : difficulty / difficultyScale,
                )}
                {difficultyUnit && (
                  <span className="text-base font-medium">
                    {" "}
                    {difficultyUnit}
                  </span>
                )}
              </p>
              <span className="text-xs text-muted-foreground">Current</span>
            </div>
            <p className="text-sm font-medium leading-4 text-muted-foreground">
              Daily averages · 30 days
            </p>
          </div>
          <div className="@container w-full min-w-0 sm:flex-1">
            <ChainHistoryChart
              data={chainHistory.data}
              metric="difficulty"
              label="Daily average mining difficulty · 30 days"
              formatValue={(value) => metricNumber(value)}
              loading={chainHistory.isPending}
              error={chainHistory.isError}
              onRetry={() => void chainHistory.refetch()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
