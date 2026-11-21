import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  addressesActivityQueryOptions,
  richListQueryOptions,
} from "@/lib/api/addresses";
import { addressHistoryQueryOptions } from "@/lib/api/stats";
import { formatCompact, formatDateTime } from "@/lib/format";
import type { Network } from "@/lib/store";
import { addressDistribution } from "@/themes/dash/lib/address-metrics";
import { useHistoryRange } from "@/themes/dash/lib/home-history";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";
import { AreaChart } from "./area-chart";
import { SkeletonBar } from "./skeleton";

function MetricHint({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-help rounded-sm text-left decoration-muted-foreground/40 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[min(20rem,calc(100vw-2rem))] border bg-popover p-3 text-left text-sm text-popover-foreground shadow-md">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

export function AddressesOverview({ network }: { network: Network }) {
  const [days, setDays] = useState(30);
  const range = useHistoryRange(days, days);
  const history = useQuery(addressHistoryQueryOptions({ network, ...range }));
  const activityRange = useHistoryRange(1, 1);
  const activity = useQuery(
    addressesActivityQueryOptions({
      network,
      page: 1,
      limit: 1,
      order: "desc",
      ...activityRange,
    }),
  );
  const rich = useQuery(
    richListQueryOptions({ network, page: 1, limit: 11, order: "desc" }),
  );
  const balances = rich.data?.resultSet;
  const ranked = balances?.filter(
    (entry) => entry.address && entry.address !== "others",
  );
  const completeDistribution =
    ranked?.length === 10 &&
    new Set(ranked.map((entry) => entry.address)).size === 10 &&
    balances?.filter((entry) => entry.address === "others").length === 1;
  const distribution = completeDistribution
    ? addressDistribution(balances)
    : null;
  const utxo = rich.data?.utxoSummary;
  const activeCount = activity.data?.pagination.total;
  const entries = [...(history.data ?? [])].sort(
    (first, second) =>
      Date.parse(first.timestamp) - Date.parse(second.timestamp),
  );
  const startTime = Date.parse(range.timestampStart);
  const endTime = Date.parse(range.timestampEnd);
  const validSeries =
    entries.length === days &&
    entries.every(
      (entry, index) =>
        Date.parse(entry.timestamp) === startTime + index * 86_400_000 &&
        Number.isSafeInteger(entry.data.newAddresses) &&
        (entry.data.newAddresses ?? -1) >= 0,
    );
  const points = validSeries
    ? entries.map((entry, index) => ({
        ...entry,
        intervalEnd: new Date(
          index + 1 < entries.length
            ? Date.parse(entries[index + 1].timestamp)
            : endTime,
        ).toISOString(),
      }))
    : [];
  const newCount = validSeries
    ? entries.reduce((sum, entry) => sum + (entry.data.newAddresses ?? 0), 0)
    : null;
  const last = points.at(-1);
  const totalCount = last?.data.totalAddresses;
  const amount = utxo?.totalAmountDuffs;
  const validAmount =
    amount != null &&
    /^\d+$/.test(amount) &&
    Number.isSafeInteger(Number(amount));
  const metrics = [
    {
      label: "Active addresses",
      value: metricNumber(
        activeCount != null &&
          Number.isSafeInteger(activeCount) &&
          activeCount >= 0
          ? activeCount
          : null,
        0,
      ),
      loading: activity.isPending,
      badge: "24H",
      unit: null,
      detail: `Distinct addresses involved in confirmed transactions. ${formatDateTime(activityRange.timestampStart)} – ${formatDateTime(activityRange.timestampEnd)}. The window ends at the last complete hour.`,
    },
    {
      label: "Value",
      value: validAmount ? formatCompact(Number(amount) / 100_000_000) : "—",
      loading: rich.isPending,
      badge: null,
      unit: "DASH",
      detail: `Value of unspent transaction outputs on ${network}. Not circulating supply. ${validAmount ? `Exact value: ${metricDuffs(amount, 8)} DASH.` : "Snapshot unavailable."}`,
    },
    {
      label: "Unspent outputs",
      value: metricNumber(
        utxo?.outputCount != null &&
          Number.isSafeInteger(utxo.outputCount) &&
          utxo.outputCount >= 0
          ? utxo.outputCount
          : null,
        0,
      ),
      loading: rich.isPending,
      badge: "UTXO",
      unit: null,
      detail:
        "Unspent transaction outputs in the Core snapshot. One transaction or address can have multiple outputs.",
    },
  ];
  const renderMetric = (
    { label, value, loading, detail, badge, unit }: (typeof metrics)[number],
    inline = false,
  ) => (
    <div
      key={label}
      className={`min-w-0 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm ${inline ? "flex items-baseline gap-1.5 self-center whitespace-nowrap" : ""}`}
    >
      <h2 className="text-sm text-muted-foreground">
        <MetricHint label={label}>{detail}</MetricHint>
      </h2>
      <div
        className={`flex items-baseline ${inline ? "gap-1" : "mt-1 flex-wrap gap-x-2 gap-y-1"}`}
      >
        {loading ? (
          <SkeletonBar className="w-24" />
        ) : (
          <strong className="break-words text-lg sm:text-xl font-extrabold tabular-nums text-foreground">
            {value}
          </strong>
        )}
        {unit && value !== "—" && !loading && (
          <span className="text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        )}
        {badge && (
          <span className="ml-auto self-center rounded-md bg-action-subtle px-2 py-1 text-[10px] font-medium text-accent">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
  return (
    <section
      aria-label="Address statistics"
      className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:gap-0">
        <div className="flex min-w-0 flex-col sm:mr-16">
          <div className="relative z-10 -mb-3 flex max-w-full flex-wrap items-baseline justify-center gap-x-2 self-center rounded-2xl border border-border bg-card px-4 py-2 shadow-sm">
            <h2 className="text-sm text-muted-foreground">
              <MetricHint label="Indexed addresses">
                Addresses reported by the indexer, not wallets or users.
                {last &&
                  ` Reporting window ends ${formatDateTime(last.intervalEnd)}.`}
              </MetricHint>
            </h2>
            {history.isPending ? (
              <SkeletonBar className="w-20" />
            ) : (
              <strong className="text-lg tabular-nums">
                {metricNumber(
                  totalCount != null &&
                    Number.isSafeInteger(totalCount) &&
                    totalCount >= 0
                    ? totalCount
                    : null,
                  0,
                )}
              </strong>
            )}
          </div>
          <div className="relative min-w-0">
            <div className="min-w-0 space-y-2 rounded-3xl dash-home-panel px-4 pb-4 pt-6 sm:pb-8 sm:pr-28">
              <h2 className="text-xl font-extrabold">
                {distribution?.topTenDuffs != null ? (
                  <MetricHint label="Top 10 addresses">
                    Combined balance of the 10 largest addresses:{" "}
                    {transactionAmount(distribution.topTenDuffs)}
                  </MetricHint>
                ) : (
                  "Top 10 addresses"
                )}
              </h2>
              {rich.isPending ? (
                <SkeletonBar className="h-8 w-32" />
              ) : distribution?.topTen != null ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-2xl font-extrabold tabular-nums text-brand">
                      {metricNumber(distribution.topTen)}%
                    </strong>{" "}
                    of total UTXO value
                  </p>
                  <div
                    aria-hidden="true"
                    className="h-1 overflow-hidden rounded-full bg-secondary"
                  >
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${distribution.topTen}%` }}
                    />
                  </div>
                </>
              ) : rich.isError ? (
                <button
                  type="button"
                  className="text-sm text-destructive underline"
                  onClick={() => void rich.refetch()}
                >
                  Retry distribution
                </button>
              ) : (
                <output className="w-full text-center text-sm text-muted-foreground">
                  No distribution data
                </output>
              )}
            </div>
            <div className="mt-2 sm:absolute sm:-right-16 sm:top-1/2 sm:mt-0 sm:w-40 sm:-translate-y-1/2">
              {renderMetric(metrics[0])}
            </div>
          </div>
        </div>
        <div className="space-y-2 sm:mr-16">
          <div className="relative mx-auto flex w-full flex-wrap justify-center gap-2 sm:-mt-4">
            {renderMetric(metrics[1], true)}
            {renderMetric(metrics[2])}
          </div>
          {(activity.isError || rich.isError) && (
            <p role="alert" className="text-sm text-destructive">
              Could not refresh address statistics.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  void activity.refetch();
                  void rich.refetch();
                }}
              >
                Retry
              </button>
            </p>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="relative z-10 inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
            <MetricHint label="New addresses">
              <p>
                Addresses first recorded by the indexer in each 24-hour
                interval, not new users or wallets.
              </p>
              <p className="mt-2">
                The API does not distinguish missing hourly records from zero
                activity. The total uses the reported counts.
              </p>
            </MetricHint>
            {history.isPending ? (
              <SkeletonBar className="w-20" />
            ) : newCount != null ? (
              <strong className="whitespace-nowrap text-lg tabular-nums text-foreground">
                {metricNumber(newCount, 0)}
                <span className="sr-only"> in the selected {days} days</span>
              </strong>
            ) : null}
          </h2>
          <fieldset
            aria-label="Address history period"
            className="flex items-center gap-1.5"
          >
            {[7, 30, 90].map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={days === period}
                aria-label={`${period} days`}
                onClick={() => setDays(period)}
                className="min-h-9 rounded-2xl border border-border bg-card px-3 text-xs font-semibold tabular-nums text-muted-foreground shadow-sm hover:border-accent aria-pressed:border-accent aria-pressed:bg-action-subtle aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                {period}D
              </button>
            ))}
          </fieldset>
        </div>
        <div className="flex min-h-40 items-center justify-center">
          {history.isPending ? (
            <SkeletonBar className="h-40 w-full" />
          ) : history.isError && !validSeries ? (
            <button
              type="button"
              className="text-sm text-destructive underline"
              onClick={() => void history.refetch()}
            >
              Retry history
            </button>
          ) : !validSeries ? (
            <output className="text-sm text-muted-foreground">
              No history data for this period
            </output>
          ) : (
            <AreaChart
              data={points}
              height={180}
              getKey={(entry) => entry.timestamp}
              getValue={(entry) => entry.data.newAddresses ?? 0}
              getXLabel={(entry) =>
                formatDateTime(entry.timestamp, {
                  month: "short",
                  day: "numeric",
                })
              }
              renderTooltip={(entry) => (
                <>
                  <p className="font-semibold tabular-nums">
                    {metricNumber(entry.data.newAddresses, 0)} new{" "}
                    {entry.data.newAddresses === 1 ? "address" : "addresses"}
                  </p>
                  <p className="text-muted-foreground">
                    24h to{" "}
                    {formatDateTime(entry.intervalEnd, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hourCycle: "h23",
                    })}{" "}
                    UTC
                  </p>
                </>
              )}
              ariaLabel="New indexed addresses per 24-hour interval"
              interpolation="linear"
              formatYLabel={formatCompact}
              minimumMax={0}
              zeroBaseline
            />
          )}
        </div>
        {history.isError && validSeries && (
          <p role="alert" className="text-sm text-destructive">
            Could not refresh history.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void history.refetch()}
            >
              Retry
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
