import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useId } from "react";
import { marketCapQueryOptions } from "@/lib/api/marketcap";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import { formatDateTime, formatHashRate, formatNumber } from "@/lib/format";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import {
  estimatedSupply,
  historyChange,
  metricNumber,
  sortedHistory,
} from "@/themes/dash/lib/home-metrics";
import { AreaChart } from "./area-chart";
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
      className={`flex min-w-0 items-center justify-between gap-6 rounded-3xl bg-card px-6 py-4 ${className}`}
    >
      <div className="min-w-0 space-y-2">
        <h3 className="dash-body-compact text-foreground/50">{label}</h3>
        <p className="dash-metric break-words text-brand">{value}</p>
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
  const blocksQuery = useQuery(homeBlocksQueryOptions(network));
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
  const priceHistory = sortedHistory(history.data);
  const supply = estimatedSupply(marketCap.data?.usd, price.data?.usd);
  const blocks = [...(blocksQuery.data?.resultSet ?? [])]
    .filter((block) => Number.isFinite(block.difficulty))
    .sort((first, second) => first.height - second.height);
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
  const difficultyLabels = Array.from(
    { length: Math.min(5, blocks.length) },
    (_, index) =>
      blocks[
        Math.round(
          (index * (blocks.length - 1)) /
            Math.max(1, Math.min(5, blocks.length) - 1),
        )
      ],
  );

  return (
    <section aria-labelledby={titleId} className="space-y-6">
      <h2 id={titleId} className="text-xl font-medium text-muted-foreground">
        General Stats
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[87.5rem]:grid-cols-[minmax(250px,1.5fr)_minmax(224px,1fr)_minmax(346px,1.7fr)_232px_minmax(200px,1fr)]">
        <StatCard
          label="Dash Price"
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
                <div className="mt-1 flex justify-between text-[10px] text-foreground/32">
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
          label="Circulating Supply"
          value={
            supply === null ? (
              "—"
            ) : (
              <span className="whitespace-nowrap">
                {formatNumber(supply / 1_000_000, {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}
                <span className="whitespace-nowrap font-medium">M Dash</span>
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
                : `≈ ${metricNumber(supply, 0)} Dash`}
            </span>
          }
        />
        <StatCard
          label="Hash Rate"
          value={
            <span title="Estimated network hash rate over the last 120 indexed blocks.">
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
                  className="rounded font-extrabold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  #{metricNumber(stats.latestHeight, 0)}
                </Link>
              ) : (
                <span>—</span>
              )}
            </span>
          }
          className="flex-wrap gap-4"
        >
          <div className="flex min-h-20 min-w-32 flex-col items-center justify-center gap-1">
            <p className="text-xl font-extrabold text-brand">—</p>
            <p className="dash-label-small text-muted-foreground">
              Highest Recorded
            </p>
            <MissingApiData
              compact
              description="The historical peak hashrate for the selected network is not available."
            />
          </div>
        </StatCard>
        <StatCard
          label="Mempool Size"
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
            <span
              className="whitespace-nowrap"
              title="Average transactions per second over the last 20 indexed blocks."
            >
              {metricNumber(stats?.transactionsPerSecond)}{" "}
              <span className="font-medium">Tx/s</span>
            </span>
          }
          detail={
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="rounded-lg bg-secondary px-2 py-1">24H</span>
              <span>—</span>
              <MissingApiData
                inline
                description="The current rate is averaged over the last 20 indexed blocks. A comparable value from 24 hours ago is not available."
              />
            </div>
          }
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6 rounded-3xl bg-card p-6 sm:flex-row sm:items-center sm:gap-12">
          <div className="min-w-0 shrink-0 space-y-2">
            <h3 className="text-base font-medium leading-4">Hashrate Graph</h3>
            <p className="whitespace-nowrap text-[32px] font-extrabold leading-[1.0813]">
              {hashRateValue}
              {hashRateUnit && (
                <span className="text-base font-medium"> {hashRateUnit}</span>
              )}
            </p>
            <p className="text-sm font-medium leading-4 text-foreground/48">
              Estimate over 120 blocks
            </p>
          </div>
          <div className="relative h-32 min-w-0 w-full sm:flex-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 inset-y-1 flex flex-col justify-between"
            >
              {[0, 1, 2, 3].map((line) => (
                <div
                  key={line}
                  className="border-t border-dashed border-foreground/15"
                />
              ))}
            </div>
            <div className="relative flex h-full items-center justify-center">
              <MissingApiData
                description="Historical hashrate and a comparable value from last month are not available for the selected network."
                className="rounded-lg bg-card p-2 text-center"
              />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6 rounded-3xl bg-card p-6 sm:flex-row sm:items-center sm:gap-12">
          <div className="min-w-0 shrink-0 space-y-2 sm:max-w-[45%]">
            <h3 className="text-base font-medium leading-4">
              Difficulty Graph
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
              <MissingApiData
                inline
                description="A comparable mining difficulty value from last month is not available."
              />
            </div>
            <p className="text-sm font-medium leading-4 text-foreground/48">
              Last {metricNumber(blocks.length, 0)} indexed blocks
            </p>
          </div>
          <div className="@container w-full min-w-0 sm:flex-1">
            {blocks.length > 1 ? (
              <>
                <AreaChart
                  compact
                  compactHeight={128}
                  data={blocks}
                  getValue={(block) => block.difficulty}
                  getKey={(block) => block.hash}
                  getXLabel={(block) => `#${metricNumber(block.height, 0)}`}
                  renderTooltip={(block) => (
                    <>
                      <p>#{metricNumber(block.height, 0)}</p>
                      <p>Difficulty: {metricNumber(block.difficulty)}</p>
                    </>
                  )}
                  ariaLabel="Mining difficulty of recent blocks"
                  minimumMax={0}
                  formatYLabel={(value) => metricNumber(value)}
                />
                <div className="mt-6 flex justify-between gap-2 text-xs font-medium text-foreground/32">
                  {difficultyLabels.map((block, index) => (
                    <span
                      key={block.hash}
                      className={
                        index === 0 || index === difficultyLabels.length - 1
                          ? "whitespace-nowrap"
                          : index === Math.floor(difficultyLabels.length / 2)
                            ? "hidden whitespace-nowrap @[16rem]:block"
                            : "hidden whitespace-nowrap @[24rem]:block"
                      }
                    >
                      #{metricNumber(block.height, 0)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="dash-body-compact flex h-32 items-center justify-center text-muted-foreground">
                {blocksQuery.isPending
                  ? "Loading chart…"
                  : "Difficulty history unavailable"}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
