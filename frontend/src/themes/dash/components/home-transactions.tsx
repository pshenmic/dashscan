import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import { transactionsBreakdown24hQueryOptions } from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { useHomeChainHistory } from "@/themes/dash/lib/home-history";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { ChainHistoryChart } from "./chain-history-chart";
import { HomeIcon } from "./home-icon";
import { InfoPopover } from "./info-popover";
import { LatestTransactionsTable } from "./latest-transactions-table";
import { MissingApiData } from "./missing-api-data";
import { TransactionHistoryCard } from "./transaction-history-card";

export function HomeTransactions() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const chain = useQuery(homeChainQueryOptions(network));
  const blocks = useQuery(homeBlocksQueryOptions(network));
  const latest = blocks.data?.resultSet[0];
  const feeHistory = useHomeChainHistory(network);
  const transactions = useQuery({
    ...transactionsQueryOptions({ network, page: 1, limit: 6, order: "desc" }),
    refetchInterval: 30_000,
  });
  const breakdown = useQuery({
    ...transactionsBreakdown24hQueryOptions({ network }),
    refetchInterval: 60_000,
  });
  const rows = transactions.data?.resultSet ?? [];
  const total = transactions.data?.pagination.total;
  const totalScale =
    total != null && total >= 1_000_000
      ? 1_000_000
      : total != null && total >= 1_000
        ? 1_000
        : 1;
  const totalUnit =
    totalScale === 1_000_000 ? "M" : totalScale === 1_000 ? "K" : "";
  const surface = "rounded-3xl bg-card px-6 py-4";
  const softShadow = "shadow-[0_0_24px_rgb(12_28_51/8%)]";

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-10 py-4 sm:py-8 lg:space-y-16"
    >
      {breakdown.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not load transaction statistics.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void breakdown.refetch()}
          >
            Try again
          </button>
        </p>
      )}
      <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,725fr)_minmax(0,503fr)] xl:gap-8 min-[1400px]:gap-[84px]">
        <div className="relative order-2 grid min-w-0 items-start gap-4 sm:grid-cols-2 xl:order-1">
          <div
            className={`${surface} ${softShadow} relative min-w-0 xl:justify-self-start`}
          >
            <h3 className="text-xs font-medium leading-[1.1] text-muted-foreground">
              Total Transactions
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p
                className="whitespace-nowrap text-xl font-extrabold leading-6 text-accent"
                title={`Estimated indexed transactions: ${metricNumber(total, 0)}`}
              >
                {total != null && "≈ "}
                {metricNumber(
                  total == null ? null : total / totalScale,
                  totalScale === 1 ? 0 : 3,
                )}
                <span className="font-medium">{totalUnit}</span>
              </p>
              <span className="dash-label-small rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                24H
              </span>
              <span
                className="dash-label-small font-extrabold text-success"
                title="Confirmed transactions in the last 24 hours"
              >
                {breakdown.isPending
                  ? "…"
                  : breakdown.isError
                    ? "Unavailable"
                    : metricNumber(breakdown.data?.total, 0)}
              </span>
            </div>
          </div>
          <div
            className={`${surface} ${softShadow} relative min-w-0 xl:mt-6 xl:justify-self-end`}
          >
            <h3 className="text-xs font-medium leading-[1.1] text-muted-foreground">
              Current TPS
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p
                className="whitespace-nowrap text-xl font-extrabold leading-6 text-accent"
                title="Average over 20 blocks"
              >
                {metricNumber(chain.data?.transactionsPerSecond)}{" "}
                <span className="font-medium">Tx/s</span>
              </p>
              <span className="inline-flex items-center gap-1">
                <span className="dash-label-small rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                  24H
                </span>
                {breakdown.data?.total != null ? (
                  <span
                    className="text-xs text-muted-foreground"
                    title="Average confirmed transaction rate over the last 24 hours"
                  >
                    Avg {metricNumber(breakdown.data.total / 86400)} Tx/s
                  </span>
                ) : breakdown.isSuccess ? (
                  <MissingApiData
                    label="Unavailable"
                    inline
                    description="The selected network has not returned the 24-hour transaction total."
                  />
                ) : (
                  <span>{breakdown.isPending ? "…" : "—"}</span>
                )}
              </span>
            </div>
          </div>
          <div
            className={`${surface} ${softShadow} flex min-w-0 flex-wrap items-center gap-6 sm:col-span-2 xl:ml-[9.5%] xl:w-[82.75%]`}
          >
            <div className="min-w-0 flex-1 basis-40">
              <h3 className="text-sm font-medium leading-4 tracking-[-0.009em] text-muted-foreground">
                Latest block fees
              </h3>
              <p className="mt-2 text-2xl font-extrabold leading-[1.2] text-accent">
                {metricDuffs(latest?.fees)}{" "}
                <span className="font-medium">DASH</span>
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                  Block
                </span>
                <span
                  className="text-muted-foreground"
                  title="Transaction fees in the latest indexed block, excluding subsidy and treasury payouts."
                >
                  {latest ? `#${metricNumber(latest.height, 0)}` : "—"}
                </span>
                {blocks.isSuccess && latest?.fees == null && (
                  <MissingApiData
                    label="Unavailable"
                    inline
                    description="The selected backend has not returned fees for this indexed block."
                  />
                )}
              </div>
            </div>
            <div className="flex min-h-16 min-w-0 flex-1 basis-48 items-center justify-center">
              <ChainHistoryChart
                data={feeHistory.data}
                metric="feesPerBlock"
                label="Daily average fees per block · 30 days"
                formatValue={(value) => `${metricDuffs(value)} DASH`}
                loading={feeHistory.isPending}
                error={feeHistory.isError}
                onRetry={() => void feeHistory.refetch()}
                height={64}
              />
            </div>
          </div>
          <div
            className={`${surface} relative min-w-0 shadow-card sm:col-span-2 sm:mx-auto sm:w-fit xl:ml-auto xl:mr-[31%]`}
          >
            <h3 className="text-xs font-medium leading-[1.1] text-muted-foreground">
              Fees average
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xl font-extrabold leading-6 text-accent">
                {metricDuffs(breakdown.data?.averageFee)}{" "}
                <span className="font-medium">DASH</span>
              </p>
              {breakdown.isSuccess && breakdown.data?.averageFee == null ? (
                <MissingApiData
                  label="Unavailable"
                  inline
                  description="The selected network has not returned an average transaction fee."
                />
              ) : (
                <span
                  className="text-xs text-muted-foreground"
                  title="Average across transactions with a known fee, excluding coinbase"
                >
                  24H
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="order-1 xl:order-2">
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h2
            id={titleId}
            className="dash-heading-page mt-2 break-words sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">Transactions</span>{" "}
            Stats
          </h2>
          <p className="dash-body mt-3 text-muted-foreground">
            Explore Dash transactions, their inputs, outputs, fees, and
            confirmation status. Check InstantSend locks where available.
          </p>
          <Link
            to="/transactions"
            className="dash-home-action dash-home-action-subtle mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2 text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore Transactions
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
              <HomeIcon name="explore" />
            </span>
          </Link>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.7fr)_minmax(0,1fr)]">
        <LatestTransactionsTable
          rows={rows}
          busy={transactions.isFetching}
          error={transactions.isError}
          onRetry={() => void transactions.refetch()}
        />
        <div className="flex min-w-0 flex-col gap-4">
          <TransactionHistoryCard network={network} />
          <div className="@container grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-stretch gap-3">
            <div className="flex min-w-0 flex-col gap-2 rounded-3xl dash-home-panel px-3 py-4 @min-[400px]:px-6">
              <h3 className="min-h-[2.2em] text-sm font-medium leading-[1.1] text-muted-foreground">
                Transaction Fees
              </h3>
              <p
                className="flex flex-wrap items-baseline gap-x-1 text-xl font-extrabold leading-[1.2] text-accent"
                title={`${metricDuffs(breakdown.data?.fees)} DASH`}
              >
                <span>{metricDuffs(breakdown.data?.fees, 4)}</span>
                <span className="text-sm font-normal">DASH</span>
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                  24H
                </span>
                {breakdown.isSuccess && breakdown.data?.fees == null && (
                  <MissingApiData
                    label="Unavailable"
                    description="The selected network has not returned total transaction fees for the last 24 hours."
                    inline
                  />
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2 rounded-3xl dash-home-panel px-3 py-4 @min-[400px]:px-6">
              <h3 className="min-h-[2.2em] text-sm font-medium leading-[1.1] text-muted-foreground">
                InstantSend lock time
              </h3>
              <p className="whitespace-nowrap text-2xl font-extrabold leading-[1.2] text-accent">
                1 <span className="font-normal">s</span>
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <InfoPopover
                  label="About the reference lock time"
                  trigger="Reference"
                >
                  Fixed display value, not a measured network latency or a
                  guarantee.
                </InfoPopover>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
