import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";
import { useClockValue } from "@/components/render-clock";
import { blockRewardQueryOptions } from "@/lib/api/blocks";
import { transactionsStatsQueryOptions } from "@/lib/api/stats";
import { formatDateTime } from "@/lib/format";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import type { Network } from "@/lib/store";
import { useNewBlocks } from "@/themes/dash/hooks/use-new-blocks";
import {
  metricBytes,
  metricDuffs,
  metricNumber,
} from "@/themes/dash/lib/home-metrics";
import {
  transactionHistoryRange,
  transactionHistorySummary,
} from "@/themes/dash/lib/transaction-metrics";
import { AreaChart } from "./area-chart";
import { BlocksTimeline } from "./blocks-timeline";
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
      {name === "reward" || name === "fees" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-7 -top-5 size-28 rotate-30 bg-brand"
          style={{
            mask: `url('/icons/blocks/${name}-decor.svg') center / contain no-repeat`,
          }}
        />
      ) : null}
      {name === "blockchain-size" || name === "difficulty" ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-card">
          <img
            src={`/icons/home/${name}.svg`}
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
        </span>
      ) : name === "superblock" || name === "fees" ? (
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
  const titleId = useId();
  const chain = useQuery(homeChainQueryOptions(network));
  const blocksQuery = useQuery(homeBlocksQueryOptions(network));
  const newHashes = useNewBlocks(blocksQuery.data?.resultSet, network);
  const blocks = [...(blocksQuery.data?.resultSet ?? [])].sort(
    (first, second) => second.height - first.height,
  );
  const reward = useQuery(
    blockRewardQueryOptions({
      network,
      height: chain.data?.latestHeight,
    }),
  );
  const day = useClockValue((now) => Math.floor(now / 86_400_000) * 86_400_000);
  const [period, setPeriod] = useState<ChartPeriod>({ days: 30 });
  const range = transactionHistoryRange(period.end ?? day, period.days);
  const midpoint = new Date(
    Date.parse(range.timestampEnd) - period.days * 86_400_000,
  ).toISOString();
  const history = useQuery(
    transactionsStatsQueryOptions({
      network,
      timestampStart: period.days === 1 ? range.timestampStart : midpoint,
      timestampEnd: range.timestampEnd,
      intervalsCount: Math.max(2, period.days),
    }),
  );
  const previousHistory = useQuery({
    ...transactionsStatsQueryOptions({
      network,
      timestampStart: range.timestampStart,
      timestampEnd: midpoint,
      intervalsCount: Math.max(2, period.days),
    }),
    enabled: period.days > 1,
  });
  const summary = transactionHistorySummary(
    [
      ...(period.days > 1 ? (previousHistory.data ?? []) : []),
      ...(history.data ?? []),
    ],
    range.timestampEnd,
    period.days,
  );
  const latest = chain.data?.latestHeight;
  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 space-y-10 rounded-3xl bg-card p-4 sm:rounded-[48px] sm:p-8 xl:space-y-12"
    >
      <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,503fr)_minmax(0,725fr)] xl:gap-12">
        <div>
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-positive-brand/12 px-3 py-1 text-success">
              Latest Superblock ·{" "}
              <Height value={chain.data?.latestSuperblockHeight} />
            </span>
          </div>
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h1
            id={titleId}
            className="dash-heading-page mt-2 sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">Blocks</span> Stats
          </h1>
          <p className="dash-body mt-3 text-foreground/50">
            Explore mined Dash blocks, their transactions, fees, and mining
            difficulty.
          </p>
        </div>
        <BlocksTimeline
          blocks={blocks}
          blockTime={chain.data?.blockTime}
          newHashes={newHashes}
          loading={blocksQuery.isPending}
          error={blocksQuery.isError}
          onRetry={() => void blocksQuery.refetch()}
        />
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Metric name="blockchain-size" label="Blockchain Size">
            <span title="Disk space used by this node’s block and undo files.">
              {metricBytes(chain.data?.sizeOnDisk)}
            </span>
          </Metric>
          <Metric name="difficulty" label="Difficulty">
            <span title="Current mining difficulty reported by the node. Difficulty has no unit.">
              {metricNumber(chain.data?.difficulty, 4)}
            </span>
          </Metric>
          {(
            [
              ["reward", "Block Subsidy", "subsidy"],
              ["fees", "Block Fees", "fees"],
            ] as const
          ).map(([name, label, field]) => (
            <Metric key={name} name={name} label={label}>
              {reward.isPending ? (
                "…"
              ) : reward.isError ? (
                <button
                  type="button"
                  className="text-sm text-destructive underline"
                  onClick={() => void reward.refetch()}
                >
                  Retry block reward
                </button>
              ) : reward.data != null ? (
                <span
                  className={
                    field === "subsidy" ? "whitespace-nowrap" : undefined
                  }
                  title={`${metricDuffs(reward.data[field])} DASH · Block #${latest}`}
                >
                  {metricDuffs(reward.data[field], field === "subsidy" ? 2 : 8)}{" "}
                  <span
                    className={
                      field === "subsidy"
                        ? "font-medium"
                        : "text-sm font-medium text-muted-foreground"
                    }
                  >
                    DASH
                  </span>
                </span>
              ) : (
                <MissingApiData
                  inline
                  description={`${label} for the latest indexed block is not available from this API.`}
                />
              )}
            </Metric>
          ))}
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
                minimumMax={3}
                tooltipPlacement="point"
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
                    <p className="text-xs font-extrabold tabular-nums">
                      {metricNumber(entry.data.count, 0)} Txs
                    </p>
                    <p className="text-[10px] font-medium text-foreground/64">
                      {formatDateTime(entry.timestamp, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      UTC
                    </p>
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
      </div>
    </section>
  );
}
