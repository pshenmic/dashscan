import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChartLine,
  Coins,
  Database,
  Gauge,
  type LucideIcon,
  ReceiptText,
} from "lucide-react";
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
import { CardDecoration } from "./card-decoration";
import { ChartDateRange, type ChartPeriod } from "./chart-date-range";
import { InfoPopover } from "./info-popover";

function MetricValue({ value, unit }: { value: string; unit?: string }) {
  return (
    <span>
      {value}
      {unit && value !== "—" && (
        <span className="font-medium text-muted-foreground"> {unit}</span>
      )}
    </span>
  );
}

function Metric({
  label,
  icon: Icon,
  description,
  detail,
  children,
}: {
  label: string;
  icon: LucideIcon;
  description: string;
  detail: ReactNode;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <article
      aria-labelledby={labelId}
      className="@container relative isolate flex min-h-[164px] min-w-0 flex-col gap-4 overflow-hidden rounded-3xl dash-home-panel p-4 sm:p-5"
    >
      <CardDecoration icon={Icon} />
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-subtle text-accent">
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </span>
        <h2
          id={labelId}
          className="text-sm font-medium leading-tight text-muted-foreground"
        >
          <InfoPopover label={label} trigger={label}>
            {description}
          </InfoPopover>
        </h2>
      </div>
      <div className="min-w-0 break-words text-xl @[15rem]:text-2xl font-semibold leading-tight tabular-nums text-foreground">
        {children}
      </div>
      <div className="mt-auto flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
        {detail}
      </div>
    </article>
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
  const latest = blocks[0]?.height ?? chain.data?.latestHeight;
  const averageSize = blocks.length
    ? blocks.reduce((total, block) => total + block.size, 0) / blocks.length
    : null;
  const averageDifficulty = blocks.length
    ? blocks.reduce((total, block) => total + block.difficulty, 0) /
      blocks.length
    : null;
  const feeTotal = blocks.reduce(
    (total, block) => total + (block.fees ?? 0),
    0,
  );
  const averageFees =
    blocks.length > 0 &&
    blocks.every(
      (block) =>
        block.fees != null &&
        Number.isSafeInteger(block.fees) &&
        block.fees >= 0,
    ) &&
    Number.isSafeInteger(feeTotal)
      ? Math.round(feeTotal / blocks.length)
      : null;
  const [chainSize, chainSizeUnit] = metricBytes(chain.data?.sizeOnDisk).split(
    " ",
  );
  const sampleDescription = `Average over the latest ${blocks.length} loaded blocks.`;
  const reward = useQuery(
    blockRewardQueryOptions({
      network,
      height: latest,
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
  return (
    <section
      aria-labelledby={titleId}
      className="grid min-w-0 items-start gap-6 rounded-3xl bg-card p-4 sm:rounded-[48px] sm:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-positive-brand/12 px-3 py-1 text-success">
              Latest Superblock ·{" "}
              <Height value={chain.data?.latestSuperblockHeight} />
            </span>
          </div>
          <h1 id={titleId} className="dash-heading-page sm:dash-heading-hero">
            <span className="font-extrabold text-brand">Blocks</span> Stats
          </h1>
        </div>
        <div className="grid min-w-0 auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
          <Metric
            label="Blockchain Size"
            icon={Database}
            description="Disk space used by this node’s block and undo files, not the total storage used by the network."
            detail={
              <InfoPopover
                label="About average block size"
                trigger={
                  <>
                    <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                      Avg block
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      {metricBytes(averageSize)}
                    </span>
                  </>
                }
              >
                {sampleDescription}
              </InfoPopover>
            }
          >
            <MetricValue value={chainSize} unit={chainSizeUnit} />
          </Metric>
          <Metric
            label="Difficulty"
            icon={Gauge}
            description="Current mining difficulty reported by Dash Core. Difficulty has no unit."
            detail={
              <InfoPopover
                label="About average difficulty"
                trigger={
                  <>
                    <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                      Avg · {blocks.length || "—"} blocks
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      {metricNumber(averageDifficulty, 4)}
                    </span>
                  </>
                }
              >
                {sampleDescription}
              </InfoPopover>
            }
          >
            {metricNumber(chain.data?.difficulty, 4)}
          </Metric>
          {(
            [
              ["Block Subsidy", "subsidy", Coins],
              ["Block Fees", "fees", ReceiptText],
            ] as const
          ).map(([label, field, icon]) => (
            <Metric
              key={field}
              label={label}
              icon={icon}
              description={
                field === "subsidy"
                  ? `Subsidy for block #${metricNumber(latest, 0)}, excluding transaction fees and treasury payouts.`
                  : `Transaction fees for block #${metricNumber(latest, 0)}, excluding subsidy.`
              }
              detail={
                field === "subsidy" ? (
                  <>
                    <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                      Block
                    </span>
                    <Height value={latest} />
                  </>
                ) : (
                  <InfoPopover
                    label="About average block fees"
                    trigger={
                      <>
                        <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                          Avg/block
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          <MetricValue
                            value={metricDuffs(averageFees)}
                            unit="DASH"
                          />
                        </span>
                      </>
                    }
                  >
                    {averageFees == null
                      ? "A complete fee sample is not available."
                      : `${sampleDescription} Rounded to the nearest duff.`}
                  </InfoPopover>
                )
              }
            >
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
              ) : reward.data != null &&
                reward.data.height === latest &&
                reward.data[field] != null ? (
                <span
                  title={`${metricDuffs(reward.data[field])} DASH · Block #${latest}`}
                >
                  <MetricValue
                    value={metricDuffs(
                      reward.data[field],
                      field === "subsidy" ? 2 : 8,
                    )}
                    unit="DASH"
                  />
                </span>
              ) : (
                <span className="text-muted-foreground" title="Not available">
                  —
                </span>
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
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <BlocksTimeline
          blocks={blocks}
          blockTime={chain.data?.blockTime}
          newHashes={newHashes}
          loading={blocksQuery.isPending}
          error={blocksQuery.isError}
          onRetry={() => void blocksQuery.refetch()}
        />
        <div className="flex min-w-0 flex-col justify-between gap-6 rounded-3xl dash-home-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 max-w-full items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-subtle text-accent">
                <ChartLine
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={1.75}
                />
              </span>
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Block Transactions
                </h2>
                <p className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-semibold leading-tight tabular-nums text-foreground">
                  <span className="whitespace-nowrap">
                    {history.isPending
                      ? "…"
                      : metricNumber(summary.currentTotal, 0)}{" "}
                    <span className="text-base font-medium text-muted-foreground">
                      Txs
                    </span>
                  </span>
                  {summary.change != null && (
                    <span
                      className="whitespace-nowrap rounded-full bg-action-subtle px-2 py-1 text-xs text-accent"
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
          <div className="grid h-[156px] min-w-0 place-items-center">
            {history.isPending ? (
              <p className="text-center text-sm text-muted-foreground">
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
                height={156}
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
              <div className="text-center text-sm text-muted-foreground">
                <p>No history for this period.</p>
                <button
                  type="button"
                  className="mt-2 text-accent underline"
                  onClick={() => void history.refetch()}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
