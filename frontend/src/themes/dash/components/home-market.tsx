import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { marketCapQueryOptions } from "@/lib/api/marketcap";
import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import { volumeQueryOptions } from "@/lib/api/volume";
import { formatCompactUsdShort, formatDateTime } from "@/lib/format";
import { appStore } from "@/lib/store";
import {
  historyChange,
  metricNumber,
  sortedHistory,
} from "@/themes/dash/lib/home-metrics";
import { AreaChart } from "./area-chart";

function chartDate(timestamp: number) {
  const date = timestamp * 1000;
  return `${formatDateTime(date, { day: "2-digit" })}.${formatDateTime(date, { month: "2-digit" })}`;
}

export function HomeMarket() {
  const network = useStore(appStore, (state) => state.network);
  const price = useQuery(priceQueryOptions({ network, currency: "usd" }));
  const marketCap = useQuery(
    marketCapQueryOptions({ network, currency: "usd" }),
  );
  const volume = useQuery({
    ...volumeQueryOptions({ network, currency: "usd" }),
    staleTime: 60_000,
  });
  const history = useQuery({
    ...priceHistoricalQueryOptions({ network, currency: "usd" }),
    staleTime: 300_000,
  });
  const points = sortedHistory(history.data).filter(
    (point) => point.value >= 0,
  );
  const change = historyChange(points);

  return (
    <div className="relative isolate min-w-0 sm:col-span-2 xl:col-span-1">
      <dl className="relative z-10 flex items-start justify-between gap-2 px-1">
        {[
          {
            label: network === "testnet" ? "Mainnet market cap" : "Market cap",
            query: marketCap,
          },
          {
            label:
              network === "testnet"
                ? "Mainnet 24h trading volume"
                : "24h volume",
            query: volume,
          },
        ].map(({ label, query }) => {
          const value =
            query.data?.usd != null &&
            Number.isFinite(query.data.usd) &&
            query.data.usd >= 0
              ? formatCompactUsdShort(query.data.usd)
              : query.isPending
                ? "…"
                : "—";
          return (
            <div
              key={label}
              className="flex max-w-[calc(50%_-_4px)] min-w-0 items-baseline gap-1.5 rounded-xl border border-border bg-card px-1.5 py-2 shadow-sm last:mt-2 sm:px-2.5"
            >
              <dt
                title={label}
                className="min-w-0 truncate text-xs font-medium leading-4 text-muted-foreground"
              >
                {label}
              </dt>
              <dd className="shrink-0 text-base font-semibold tabular-nums text-accent">
                {query.isError ? (
                  <button
                    type="button"
                    aria-label={`Retry ${label.toLowerCase()}`}
                    onClick={() => void query.refetch()}
                    className="rounded underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {value === "—" ? "Retry" : value}
                  </button>
                ) : (
                  value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <div className="dash-home-panel relative -mt-3 flex min-h-[126px] min-w-0 items-center justify-between gap-6 rounded-3xl px-6 pb-4 pt-5">
        <div className="min-w-0 space-y-2">
          <h3 className="dash-body-compact text-muted-foreground">
            Dash Price (USD)
          </h3>
          <p className="dash-metric text-accent">
            {price.data?.usd != null &&
            Number.isFinite(price.data.usd) &&
            price.data.usd >= 0
              ? `$${metricNumber(price.data.usd)}`
              : price.isPending
                ? "…"
                : "—"}
          </p>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
              24H
            </span>
            {change != null && (
              <span
                className={`font-extrabold ${change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {change > 0 ? "↑" : change < 0 ? "↓" : ""}
                {metricNumber(Math.abs(change))}%
              </span>
            )}
            {price.isError && (
              <button
                type="button"
                onClick={() => void price.refetch()}
                className="rounded text-xs text-destructive underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Retry
              </button>
            )}
          </div>
        </div>
        <div className="min-w-24 flex-1">
          <div className="flex min-h-[62px] items-center">
            {points.length > 1 ? (
              <AreaChart
                key={network}
                compact
                data={points}
                getValue={(point) => point.value}
                getKey={(point) => point.timestamp}
                getXLabel={(point) => formatDateTime(point.timestamp * 1000)}
                renderTooltip={(point) => (
                  <>
                    <p className="font-extrabold">
                      ${metricNumber(point.value)}
                    </p>
                    <p>{formatDateTime(point.timestamp * 1000)}</p>
                  </>
                )}
                ariaLabel="Dash price history in USD over the last day"
                formatYLabel={(value) => `$${metricNumber(value)}`}
                minimumMax={0}
              />
            ) : history.isFetching ? (
              <output className="text-xs text-muted-foreground">
                Loading chart…
              </output>
            ) : (
              <button
                type="button"
                onClick={() => void history.refetch()}
                className="rounded text-left text-xs text-muted-foreground underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Retry price chart
              </button>
            )}
          </div>
          <div className="mt-1 flex min-h-3 justify-between text-[10px] text-muted-foreground">
            {points.length > 1 && (
              <>
                <span>{chartDate(points[0].timestamp)}</span>
                <span>{chartDate(points[points.length - 1].timestamp)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
