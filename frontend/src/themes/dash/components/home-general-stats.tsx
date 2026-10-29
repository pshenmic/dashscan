import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useId } from "react";
import { marketCapQueryOptions } from "@/lib/api/marketcap";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import { formatCompact, formatDateTime, formatHashRate } from "@/lib/format";
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
      {value > 0 ? "+" : ""}
      {metricNumber(value)}%
    </span>
  );
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
  const priceHistory = sortedHistory(history.data);
  const supply = estimatedSupply(marketCap.data?.usd, price.data?.usd);
  const blocks = [...(blocksQuery.data?.resultSet ?? [])]
    .filter((block) => Number.isFinite(block.difficulty))
    .sort((first, second) => first.height - second.height);
  const firstPrice = priceHistory[0];
  const lastPrice = priceHistory.at(-1);

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1.3fr_1fr_1fr]">
        <StatCard
          label="Dash Price"
          value={
            price.data?.usd != null ? `$${metricNumber(price.data.usd)}` : "—"
          }
          detail={
            <span className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-secondary px-2 py-1">
                {firstPrice && lastPrice
                  ? "Period"
                  : price.isPending
                    ? "Loading…"
                    : "USD"}
              </span>
              <Change value={historyChange(priceHistory)} />
            </span>
          }
          className="sm:col-span-2 xl:col-span-1"
        >
          <div className="w-28 min-w-0 flex-1">
            {priceHistory.length > 1 && firstPrice && lastPrice ? (
              <>
                <AreaChart
                  data={priceHistory}
                  getValue={(entry) => entry.value}
                  getKey={(entry) => entry.timestamp}
                  getXLabel={() => ""}
                  renderTooltip={(entry) => `$${metricNumber(entry.value)}`}
                  ariaLabel="Dash price history in USD"
                  minimumMax={0}
                  className="[&_svg]:h-20 [&_svg_text]:hidden"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {formatDateTime(firstPrice.timestamp * 1000, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span>
                    {formatDateTime(lastPrice.timestamp * 1000, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
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
          value={supply === null ? "—" : `${formatCompact(supply)} Dash`}
          detail={
            <span title="Estimated from market capitalization divided by the USD price.">
              {supply === null
                ? "Estimate unavailable"
                : `≈ ${metricNumber(supply, 0)} Dash`}
            </span>
          }
        />
        <StatCard
          label="Hash Rate"
          value={formatHashRate(stats?.hashRate)}
          detail="Estimated over 120 blocks"
        />
        <StatCard
          label="Mempool Size"
          value={metricNumber(stats?.mempoolSize, 0)}
          detail="Pending transactions"
        />
        <StatCard
          label="Current TPS"
          value={`${metricNumber(stats?.transactionsPerSecond)} Tx/s`}
          detail="Average over 20 blocks"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6 rounded-3xl bg-card p-6 sm:flex-row sm:items-center">
          <div className="shrink-0 space-y-2">
            <h3 className="dash-body">Hashrate Graph</h3>
            <p className="dash-heading-page">
              {formatHashRate(stats?.hashRate)}
            </p>
            <p className="dash-label-small text-muted-foreground">
              Current network estimate
            </p>
          </div>
          <MissingApiData
            description="Historical hashrate is not available from the API yet."
            className="flex min-h-40 flex-1 flex-col items-center justify-center text-center"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6 rounded-3xl bg-card p-6 sm:flex-row sm:items-center">
          <div className="shrink-0 space-y-2">
            <h3 className="dash-body">Difficulty Graph</h3>
            <p className="dash-heading-page">
              {metricNumber(stats?.difficulty)}
            </p>
            <p className="dash-label-small text-muted-foreground">
              Last {metricNumber(blocks.length, 0)} indexed blocks
            </p>
          </div>
          <div className="min-w-0 flex-1">
            {blocks.length > 1 ? (
              <AreaChart
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
                formatYLabel={(value) =>
                  value !== 0 && value < 0.01
                    ? value.toExponential(1)
                    : metricNumber(value, 0)
                }
                className="[&_svg]:min-h-40"
              />
            ) : (
              <p className="dash-body-compact text-muted-foreground">
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
