import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { LockKeyhole } from "lucide-react";
import { useId } from "react";
import { useClockValue } from "@/components/render-clock";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  transactionsBreakdown24hQueryOptions,
  transactionsStatsQueryOptions,
} from "@/lib/api/stats";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { formatDateTime } from "@/lib/format";
import { homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  transactionAmount,
  transactionHistoryRange,
  transactionHistorySummary,
} from "@/themes/dash/lib/transaction-metrics";
import { AreaChart } from "./area-chart";
import { BlockAge } from "./block-age";
import { HomeIcon } from "./home-icon";
import { HomeTable } from "./home-table";
import { IdentifierLink } from "./identifier-link";
import { MissingApiData } from "./missing-api-data";
import { TransactionTypeBadge } from "./transaction-type-badge";

export function HomeTransactions() {
  const titleId = useId();
  const day = useClockValue((now) => Math.floor(now / 86_400_000) * 86_400_000);
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
  const range = transactionHistoryRange(day);
  const history = useQuery(
    transactionsStatsQueryOptions({ network, ...range }),
  );
  const summary = transactionHistorySummary(history.data, range.timestampEnd);
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
      className="space-y-10 rounded-3xl bg-card p-4 sm:p-8 lg:space-y-16 lg:rounded-[48px]"
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
        <div className="min-w-0 rounded-3xl bg-foreground/3 p-4 sm:p-6">
          <h3 className="text-2xl font-medium leading-[1.1]">
            Transaction List
          </h3>
          <p className="mt-2 text-sm font-medium leading-[1.1] text-foreground/48">
            Latest indexed transactions · updates every 30 seconds
          </p>
          {transactions.isError && (
            <p role="alert" className="dash-body-compact mt-4 text-destructive">
              Could not load transactions.{" "}
              {rows.length > 0 && "Showing the last available data. "}
              <button
                type="button"
                className="underline"
                onClick={() => void transactions.refetch()}
              >
                Try again
              </button>
            </p>
          )}
          <div className="mt-6 overflow-x-auto">
            <HomeTable className="min-w-[700px] font-medium">
              <caption className="sr-only">
                Latest mined transactions, newest blocks first. Age is the age
                of the containing block. Output total includes all outputs,
                including change.
              </caption>
              <thead className="text-foreground/48">
                <tr>
                  {["Transaction Hash", "Type", "Age", "Output total"].map(
                    (label) => (
                      <th
                        key={label}
                        scope="col"
                        title={
                          label === "Age"
                            ? "Time since the containing block was mined"
                            : label === "Output total"
                              ? "Sum of all outputs, including change, in DASH"
                              : undefined
                        }
                        className="border-b border-foreground/8 px-3 pb-3 pt-2 font-medium first:pl-11 [&:nth-child(n+3)]:text-right"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((transaction) => (
                  <tr
                    key={transaction.hash}
                    className="border-b border-foreground/8 last:border-0"
                  >
                    <td data-grow className="px-3 py-[18px]">
                      <IdentifierLink
                        kind="transaction"
                        value={transaction.hash}
                        prefix={
                          <img
                            src="/icons/home/transaction.svg"
                            alt=""
                            width={24}
                            height={24}
                            className="size-6 shrink-0"
                          />
                        }
                      />
                    </td>
                    <td className="px-3 py-[18px]">
                      <TransactionTypeBadge type={transaction.type} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-[18px] tabular-nums">
                      <div className="flex items-center justify-end gap-2">
                        {transaction.timestamp ? (
                          <BlockAge timestamp={transaction.timestamp} />
                        ) : (
                          <span title="Block timestamp is missing">—</span>
                        )}
                        <span className="flex size-6 shrink-0 items-center justify-center">
                          {transaction.instantLock && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="InstantSend locked"
                                  className="inline-flex size-6 items-center justify-center rounded-full text-foreground/64 focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                  <LockKeyhole
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-64">
                                InstantSend locked: a masternode quorum has
                                locked this transaction's inputs to prevent
                                double-spending. This is separate from block
                                confirmations.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-[18px] text-right tabular-nums text-brand">
                      {transactionAmount(transaction.amount)}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-muted-foreground"
                    >
                      {transactions.isPending
                        ? "Loading transactions…"
                        : transactions.isError
                          ? "Transaction data unavailable"
                          : "No transactions found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </HomeTable>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex-1 rounded-3xl bg-secondary p-6">
            <h3 className="dash-body">Transactions history</h3>
            <p className="dash-heading-page mt-2">
              {metricNumber(summary.currentTotal, 0)}{" "}
              <span className="text-base">TXS</span>
            </p>
            <p className="dash-label-small mt-2 text-muted-foreground">
              Last 30 complete days (UTC)
            </p>
            {summary.change !== null && (
              <p
                className={`dash-label-small mt-2 ${summary.change >= 0 ? "text-success" : "text-destructive"}`}
              >
                {summary.change > 0 ? "+" : ""}
                {metricNumber(summary.change)}% vs previous 30 days
              </p>
            )}
            {history.isPending ? (
              <p className="dash-body-compact py-8 text-muted-foreground">
                Loading history…
              </p>
            ) : history.isError ? (
              <p
                role="alert"
                className="dash-body-compact py-6 text-destructive"
              >
                History is temporarily unavailable.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void history.refetch()}
                >
                  Retry history
                </button>
              </p>
            ) : !summary.current.length ? (
              <p className="dash-body-compact py-8 text-muted-foreground">
                No transaction history available.
              </p>
            ) : (
              <AreaChart
                data={summary.current}
                getValue={(entry) => entry.data.count}
                getKey={(entry) => entry.timestamp}
                getXLabel={(entry) =>
                  formatDateTime(entry.timestamp, { day: "2-digit" })
                }
                renderTooltip={(entry) => (
                  <>
                    <p>{metricNumber(entry.data.count, 0)} transactions</p>
                    <p>
                      {formatDateTime(entry.timestamp, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </>
                )}
                ariaLabel="Transaction counts over the last 30 complete days"
                formatYLabel={(value) => metricNumber(value, 0)}
                className="mt-4 [&_svg]:min-h-32"
              />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-secondary p-6">
              <h3 className="dash-body-compact text-muted-foreground">
                Transaction Fees · 24H
              </h3>
              <p className="dash-metric mt-2 text-brand">
                — <span className="font-medium">DASH</span>
              </p>
              <MissingApiData
                description="The API does not provide total fees or their change over 24 hours."
                compact
                className="mt-3"
              />
            </div>
            <div className="rounded-3xl bg-secondary p-6">
              <h3 className="dash-body-compact text-muted-foreground">
                InstantLock time
              </h3>
              <p className="dash-metric mt-2 text-brand">
                — <span className="font-medium">Sec</span>
              </p>
              <MissingApiData
                description="Lock status is available per transaction, but measured lock duration is not."
                compact
                className="mt-3"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
