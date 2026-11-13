import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import { transactionsBreakdown24hQueryOptions } from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { appStore } from "@/lib/store";
import {
  percentageChange,
  useHistoryRange,
  useHomeChainHistory,
} from "@/themes/dash/lib/home-history";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";
import { ChainHistoryChart } from "./chain-history-chart";
import { HomeIcon } from "./home-icon";
import { IdentifierLink } from "./identifier-link";
import { InfoPopover } from "./info-popover";

export function HomeCoinJoin() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const transactions = useQuery({
    ...transactionsQueryOptions({
      network,
      coinjoin: true,
      page: 1,
      limit: 4,
      order: "desc",
    }),
    refetchInterval: 30_000,
  });
  const range = useHistoryRange(7);
  const volume = useQuery(
    transactionsBreakdown24hQueryOptions({ network, ...range }),
  );
  const previousVolume = useQuery(
    transactionsBreakdown24hQueryOptions({
      network,
      timestampStart: new Date(
        Date.parse(range.timestampStart) - 7 * 86400000,
      ).toISOString(),
      timestampEnd: range.timestampStart,
    }),
  );
  const history = useHomeChainHistory(network, 7);
  const change = percentageChange(
    volume.data?.coinjoinAmount,
    previousVolume.data?.coinjoinAmount,
  );
  const stats = useQuery({
    ...transactionsBreakdown24hQueryOptions({ network }),
    refetchInterval: 30_000,
  });
  const count = stats.data?.coinjoin;
  const hasCount = count != null && Number.isSafeInteger(count) && count >= 0;

  return (
    <section
      aria-labelledby={titleId}
      className="grid items-center gap-8 xl:grid-cols-[minmax(0,293fr)_minmax(0,436fr)_minmax(0,455fr)] xl:gap-16"
    >
      <div className="min-w-0 xl:order-3">
        <p className="text-xl font-medium text-muted-foreground">Dash Chain</p>
        <h2
          id={titleId}
          className="dash-heading-page mt-2 sm:dash-heading-hero"
        >
          <span className="font-extrabold text-brand">CoinJoin</span> Stats
        </h2>
        <p className="dash-body mt-3 text-muted-foreground">
          Explore CoinJoin transactions on the Dash network and track indexed
          mixing activity.
        </p>
        <Link
          to="/transactions"
          search={{ coinjoin: true }}
          className="dash-home-action dash-home-action-subtle mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2 text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Explore CoinJoin Transactions
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
            <HomeIcon name="explore" />
          </span>
        </Link>
      </div>
      <div className="dash-home-panel flex min-w-0 flex-col gap-6 self-stretch rounded-3xl p-6 xl:order-1 xl:min-h-[316px]">
        <div>
          <h3 className="dash-heading-section">Recent CoinJoin</h3>
        </div>
        {transactions.isPending ? (
          <output className="text-sm text-muted-foreground">
            Loading transactions…
          </output>
        ) : transactions.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load CoinJoin transactions.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void transactions.refetch()}
            >
              Try again
            </button>
          </p>
        ) : transactions.data.resultSet.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No CoinJoin transactions found.
          </p>
        ) : (
          <ul
            className="flex flex-col gap-3"
            aria-label="Recent CoinJoin transactions"
          >
            {transactions.data.resultSet.map((transaction) => (
              <li
                key={transaction.hash}
                className="grid min-h-12 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-surface-subtle px-3 py-2 text-sm"
              >
                <IdentifierLink kind="transaction" value={transaction.hash} />
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {transaction.timestamp ? (
                    <BlockAge
                      timestamp={transaction.timestamp}
                      blockHeight={transaction.blockHeight}
                    />
                  ) : (
                    "Pending"
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3">
          <h4 className="text-sm font-medium leading-4 text-muted-foreground">
            Transactions · 24H
          </h4>
          {stats.isError ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              Transaction count unavailable.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void stats.refetch()}
              >
                Try again
              </button>
            </p>
          ) : stats.isPending ? (
            <p className="dash-body-compact text-muted-foreground">Loading…</p>
          ) : hasCount ? (
            <p className="text-sm font-extrabold tabular-nums text-accent">
              {metricNumber(count, 0)}
            </p>
          ) : (
            <span className="text-sm text-muted-foreground">Unavailable</span>
          )}
        </div>
      </div>
      <div className="dash-home-panel flex min-w-0 flex-col gap-8 self-stretch rounded-3xl p-6 xl:order-2 xl:min-h-[316px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="text-base font-medium leading-4">
              <InfoPopover
                label="About the mixed amount"
                trigger="CoinJoin volume · 7D"
              >
                Sum of amounts in transactions classified as CoinJoin, including
                repeated mixing rounds. This is processed volume, not unique
                funds.
              </InfoPopover>
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <p
                className="text-[32px] font-extrabold leading-[1.0813]"
                title={`${metricDuffs(volume.data?.coinjoinAmount)} DASH`}
              >
                {metricDuffs(volume.data?.coinjoinAmount, 2)}{" "}
                <span className="text-base font-medium">DASH</span>
              </p>
              {volume.isPending || previousVolume.isPending ? (
                <output aria-label="Loading CoinJoin volume comparison">
                  …
                </output>
              ) : volume.isError || previousVolume.isError ? (
                <button
                  type="button"
                  className="text-sm text-destructive underline"
                  aria-label="Retry CoinJoin volume comparison"
                  onClick={() => {
                    void volume.refetch();
                    void previousVolume.refetch();
                  }}
                >
                  Retry
                </button>
              ) : change != null ? (
                <span
                  title={`CoinJoin volume change: ${metricNumber(change)}% compared to the previous week`}
                  className={`rounded-full px-2 py-1 text-xs font-extrabold tabular-nums ${change > 0 ? "bg-positive-brand/12 text-success" : change < 0 ? "bg-destructive/12 text-destructive" : "bg-secondary text-muted-foreground"}`}
                >
                  {change > 0 ? "↑" : change < 0 ? "↓" : ""}
                  {metricNumber(Math.abs(change))}%
                </span>
              ) : previousVolume.data?.coinjoinAmount === 0 ? (
                <span
                  className="rounded-full bg-secondary px-2 py-1 text-xs font-extrabold text-muted-foreground"
                  title="A percentage change cannot be calculated from zero volume."
                >
                  —
                </span>
              ) : null}
            </div>
            {change != null && (
              <p className="text-sm font-medium leading-4 text-muted-foreground">
                Compared to last{" "}
                <strong className="font-extrabold">week</strong>
              </p>
            )}
          </div>
        </div>
        <div className="flex min-h-[164px] flex-1 flex-col justify-center">
          <ChainHistoryChart
            data={history.data}
            metric="coinjoinAmount"
            label="Daily CoinJoin volume · 7 days"
            formatValue={(value) => `${metricDuffs(value)} DASH`}
            loading={history.isPending}
            error={history.isError}
            onRetry={() => void history.refetch()}
            height={164}
            detailedAxis
          />
        </div>
      </div>
    </section>
  );
}
