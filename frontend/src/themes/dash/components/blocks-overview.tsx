import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useClockValue } from "@/components/render-clock";
import { transactionsStatsQueryOptions } from "@/lib/api/stats";
import { formatDateTime } from "@/lib/format";
import { homeChainQueryOptions } from "@/lib/home";
import type { Network } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  transactionHistoryRange,
  transactionHistorySummary,
} from "@/themes/dash/lib/transaction-metrics";
import { AreaChart } from "./area-chart";
import { ChartDateRange, type ChartPeriod } from "./chart-date-range";
import { MissingApiData } from "./missing-api-data";

function Metric({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[152px] min-w-0 flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-brand/4 p-4">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-7 -top-5 size-28 rotate-30 bg-brand"
        style={{
          mask: `url('/icons/blocks/${name}-decor.svg') center / contain no-repeat`,
        }}
      />
      {name === "superblock" || name === "fees" ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-action-subtle">
          <img
            src={`/icons/blocks/${name}.svg`}
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
        </span>
      ) : (
        <img
          src={`/icons/blocks/${name}.svg`}
          alt=""
          width={48}
          height={48}
          className="size-12"
        />
      )}
      <div className="relative space-y-1">
        <div className="text-xl font-extrabold leading-tight tabular-nums xl:text-2xl">
          {children}
        </div>
        <p className="text-sm leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Height({ value }: { value: number | null | undefined }) {
  return value == null ? (
    "—"
  ) : (
    <Link
      to="/blocks/$hashOrHeight"
      params={{ hashOrHeight: String(value) }}
      className="hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      {metricNumber(value, 0)}
    </Link>
  );
}

export function BlocksOverview({ network }: { network: Network }) {
  const chain = useQuery(homeChainQueryOptions(network));
  const day = useClockValue((now) => Math.floor(now / 86_400_000) * 86_400_000);
  const [period, setPeriod] = useState<ChartPeriod>({ days: 30 });
  const range = transactionHistoryRange(period.end ?? day, period.days);
  const midpoint = new Date(
    Date.parse(range.timestampEnd) - period.days * 86_400_000,
  ).toISOString();
  const history = useQuery(
    transactionsStatsQueryOptions({
      network,
      timestampStart: midpoint,
      timestampEnd: range.timestampEnd,
      intervalsCount: period.days,
    }),
  );
  const previousHistory = useQuery(
    transactionsStatsQueryOptions({
      network,
      timestampStart: range.timestampStart,
      timestampEnd: midpoint,
      intervalsCount: period.days,
    }),
  );
  const summary = transactionHistorySummary(
    [...(previousHistory.data ?? []), ...(history.data ?? [])],
    range.timestampEnd,
    period.days,
  );
  const seconds =
    chain.data?.blockTime != null && chain.data.blockTime > 0
      ? Math.round(chain.data.blockTime / 1000)
      : null;
  const latest = chain.data?.latestHeight;
  return (
    <section
      aria-label="Block statistics"
      className="grid min-w-0 gap-6 rounded-3xl bg-card p-4 sm:p-6 lg:grid-cols-[minmax(0,614fr)_minmax(0,690fr)]"
    >
      <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3">
        <Metric name="latest" label="Latest Block">
          <Height value={latest} />
        </Metric>
        <Metric name="time" label="Block Time">
          <span title="Average interval over 120 indexed blocks">
            {seconds == null
              ? "—"
              : `${Math.floor(seconds / 60)}m ${seconds % 60}s`}
          </span>
        </Metric>
        <Metric name="superblock" label="Latest Superblock">
          <div className="flex flex-wrap items-center gap-2">
            <Height value={chain.data?.latestSuperblockHeight} />
            <MissingApiData
              inline
              description="Treasury paid: actual DAO proposal payouts in the displayed superblock. Awaiting a verified amount tied to that block's height and hash, returned in duffs and displayed in DASH. Exclude miner, masternode and Platform rewards; do not substitute the available budget. Distinguish a confirmed zero payout from unavailable data."
            />
          </div>
        </Metric>
        <Metric name="total" label="Total Blocks">
          {metricNumber(latest == null ? null : latest + 1, 0)}
        </Metric>
        <Metric name="reward" label="Block Reward">
          <MissingApiData
            inline
            description="The deployed API does not expose the reward breakdown for a specific block yet."
          />
        </Metric>
        <Metric name="fees" label="Block Fees">
          <MissingApiData
            inline
            description="The deployed API does not expose fees for the latest indexed block yet."
          />
        </Metric>
        {chain.isError && (
          <button
            type="button"
            className="text-left text-sm text-destructive underline col-span-full"
            onClick={() => void chain.refetch()}
          >
            Retry block statistics
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/icons/blocks/transactions.svg"
              alt=""
              width={64}
              height={64}
              className="hidden size-16 shrink-0 sm:block"
            />
            <div className="space-y-3">
              <h2 className="text-sm text-muted-foreground">
                Block Transactions
              </h2>
              <p className="flex flex-wrap items-center gap-2 text-[32px] font-extrabold leading-none">
                {history.isPending
                  ? "…"
                  : metricNumber(summary.currentTotal, 0)}{" "}
                <span className="text-base font-medium text-muted-foreground">
                  Txs
                </span>
                {summary.change != null && (
                  <span
                    className="rounded-full bg-action-subtle px-2 py-1 text-xs text-accent"
                    title={`Compared with the preceding ${period.days} complete UTC days`}
                  >
                    {summary.change > 0 ? "↑" : summary.change < 0 ? "↓" : ""}{" "}
                    {metricNumber(Math.abs(summary.change))}%
                  </span>
                )}
              </p>
            </div>
          </div>
          <ChartDateRange value={period} today={day} onChange={setPeriod} />
        </div>
        <div className="min-h-36 sm:min-h-[228px]">
          {history.isPending ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Loading history…
            </p>
          ) : history.isError ? (
            <button
              type="button"
              className="text-sm text-destructive underline"
              onClick={() => void history.refetch()}
            >
              Retry transaction history
            </button>
          ) : summary.currentComplete ? (
            <AreaChart
              data={summary.current}
              getValue={(entry) => entry.data.count}
              getKey={(entry) => entry.timestamp}
              getXLabel={(entry) =>
                formatDateTime(entry.timestamp, {
                  month: "short",
                  day: "numeric",
                })
              }
              renderTooltip={(entry) => (
                <>
                  <p>
                    {formatDateTime(entry.timestamp, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p>{metricNumber(entry.data.count, 0)} transactions</p>
                </>
              )}
              ariaLabel="Daily block transactions"
              formatYLabel={(value) => metricNumber(value, 0)}
            />
          ) : (
            <MissingApiData description="Complete transaction history for the selected period is not available." />
          )}
        </div>
      </div>
    </section>
  );
}
