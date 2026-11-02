import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import { transactionsBreakdown24hQueryOptions } from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { HomeIcon } from "./home-icon";
import { LatestTransactionsTable } from "./latest-transactions-table";
import { MissingApiData } from "./missing-api-data";
import { TransactionHistoryCard } from "./transaction-history-card";

export function HomeTransactions() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const chain = useQuery(homeChainQueryOptions(network));
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
      <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,725fr)_minmax(0,503fr)] xl:gap-8 min-[1400px]:gap-[84px]">
        <div className="relative order-2 grid min-w-0 gap-4 sm:grid-cols-2 xl:order-1 xl:block xl:h-[243px]">
          <div
            className={`${surface} ${softShadow} relative z-10 xl:absolute xl:left-0 xl:top-0`}
          >
            <h3 className="text-xs font-medium leading-[1.1] text-foreground/50">
              Total Transactions
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p
                className="whitespace-nowrap text-xl font-extrabold leading-6 text-brand"
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
            className={`${surface} ${softShadow} relative z-10 xl:absolute xl:right-0 xl:top-0`}
          >
            <h3 className="text-xs font-medium leading-[1.1] text-foreground/50">
              Current TPS
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p
                className="whitespace-nowrap text-xl font-extrabold leading-6 text-brand"
                title="Average over 20 blocks"
              >
                {metricNumber(chain.data?.transactionsPerSecond)}{" "}
                <span className="font-medium">Tx/s</span>
              </p>
              <span className="inline-flex items-center gap-1">
                <span className="dash-label-small rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                  24H
                </span>
                <MissingApiData
                  inline
                  description="The API does not provide the TPS change over 24 hours."
                />
              </span>
            </div>
          </div>
          <div
            className={`${surface} ${softShadow} flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:gap-12 xl:absolute xl:left-[9.5%] xl:top-[55px] xl:h-[133px] xl:w-[82.75%]`}
          >
            <div className="shrink-0">
              <h3 className="text-sm font-medium leading-4 tracking-[-0.009em] text-foreground/48">
                Transaction fees per block
              </h3>
              <p className="mt-2 text-2xl font-extrabold leading-[1.2] text-brand">
                — <span className="font-medium">DASH</span>
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                  Block
                </span>
                {chain.data?.latestHeight != null ? (
                  <Link
                    to="/blocks/$hashOrHeight"
                    params={{ hashOrHeight: String(chain.data.latestHeight) }}
                    className="font-extrabold text-brand/64 hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    #{metricNumber(chain.data.latestHeight, 0)}
                  </Link>
                ) : (
                  <span className="text-brand/64">—</span>
                )}
              </div>
            </div>
            <div className="flex min-h-16 flex-1 items-center justify-center xl:h-full">
              <MissingApiData
                inline
                description="Aggregated fees per block and their history are not exposed by the API."
              />
            </div>
          </div>
          <div
            className={`${surface} relative z-10 shadow-card sm:col-span-2 sm:mx-auto sm:w-fit xl:absolute xl:bottom-0 xl:right-[31%]`}
          >
            <h3 className="text-xs font-medium leading-[1.1] text-foreground/50">
              Fees average
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xl font-extrabold leading-6 text-brand">
                — <span className="font-medium">DASH</span>
              </p>
              <MissingApiData
                inline
                description="Average transaction fees are not exposed by the API."
              />
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
          <p className="dash-body mt-3 text-foreground/50">
            Explore Dash transactions, their inputs, outputs, fees, and
            confirmation status. Check InstantSend locks where available.
          </p>
          <Link
            to="/transactions"
            className="dash-home-action mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full bg-action-subtle py-2 pl-6 pr-2 text-brand hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
          loading={transactions.isPending}
          error={transactions.isError}
          onRetry={() => void transactions.refetch()}
        />
        <div className="flex min-w-0 flex-col gap-4">
          <TransactionHistoryCard network={network} />
          <div className="@container grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-stretch gap-3">
            <div className="flex min-w-0 flex-col gap-2 rounded-3xl dash-home-panel px-3 py-4 @min-[400px]:px-6">
              <h3 className="min-h-[2.2em] text-sm font-medium leading-[1.1] text-foreground/50">
                Transaction Fees
              </h3>
              <p className="whitespace-nowrap text-2xl font-extrabold leading-[1.2] text-brand">
                — <span className="font-normal">DASH</span>
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                  24H
                </span>
                <MissingApiData
                  description="Total transaction fees for the last 24 hours and their change are not available from the API."
                  inline
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2 rounded-3xl dash-home-panel px-3 py-4 @min-[400px]:px-6">
              <h3 className="min-h-[2.2em] text-sm font-medium leading-[1.1] text-foreground/50">
                InstantSend lock time
              </h3>
              <p className="whitespace-nowrap text-2xl font-extrabold leading-[1.2] text-brand">
                — <span className="font-normal">s</span>
              </p>
              <MissingApiData
                description="The API provides InstantSend lock status, but not the time taken to obtain a lock."
                compact
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
