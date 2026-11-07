import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
import { AreaChart } from "./area-chart";
import { BalanceDistribution } from "./balance-distribution";
import { MissingApiData } from "./missing-api-data";
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
  const distribution = addressDistribution(rich.data?.resultSet);
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
  const snapshotHeight = utxo?.height;
  const validHeight =
    snapshotHeight != null &&
    Number.isSafeInteger(snapshotHeight) &&
    snapshotHeight >= 0;
  const metrics = [
    {
      label: "Indexed addresses",
      value: metricNumber(
        totalCount != null &&
          Number.isSafeInteger(totalCount) &&
          totalCount >= 0
          ? totalCount
          : null,
        0,
      ),
      loading: history.isPending,
      badge: null,
      unit: null,
      detail: `Addresses recorded by the indexer, not wallets or users. ${last ? `Through ${formatDateTime(last.intervalEnd)}.` : "Snapshot unavailable."}`,
    },
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
      label: "UTXO value",
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
  return (
    <section
      aria-label="Address statistics"
      className="space-y-6 rounded-3xl bg-card p-4 sm:rounded-[48px] sm:p-8"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-h-60 flex-1 items-center rounded-3xl bg-secondary p-6">
            {rich.isPending ? (
              <SkeletonBar className="h-40 w-full" />
            ) : distribution ? (
              <BalanceDistribution key={network} distribution={distribution} />
            ) : rich.isError ? (
              <button
                type="button"
                className="text-sm text-destructive underline"
                onClick={() => void rich.refetch()}
              >
                Retry distribution
              </button>
            ) : (
              <MissingApiData description="A complete top-10 address balance distribution and the remaining UTXO balance are required." />
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {metrics.map(({ label, value, loading, detail, badge, unit }) => (
              <div
                key={label}
                className="min-w-0 rounded-3xl bg-secondary px-6 py-4"
              >
                <h2 className="text-sm text-muted-foreground">
                  <MetricHint label={label}>{detail}</MetricHint>
                </h2>
                <div className="mt-3 flex min-h-9 flex-wrap items-baseline gap-x-2 gap-y-1">
                  {loading ? (
                    <SkeletonBar className="w-24" />
                  ) : (
                    <strong className="break-words text-2xl font-extrabold tabular-nums text-foreground">
                      {value}
                    </strong>
                  )}
                  {unit && (
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
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-secondary px-2 py-1">
              {network === "testnet" ? "Testnet" : "Mainnet"}
            </span>
            <span>UTXO snapshot</span>
            {validHeight ? (
              <Link
                to="/blocks/$hashOrHeight"
                params={{ hashOrHeight: String(snapshotHeight) }}
                className="text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                #{metricNumber(snapshotHeight, 0)}
              </Link>
            ) : (
              <span>—</span>
            )}
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
        <div className="flex min-w-0 flex-col gap-6 rounded-3xl bg-secondary p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">
              <MetricHint label="New addresses">
                <p>
                  Addresses first recorded by the indexer in each 24-hour
                  interval, not new users or wallets.
                </p>
                <p className="mt-2">
                  The API does not distinguish missing hourly records from zero
                  activity. Totals and averages use the reported counts.
                </p>
              </MetricHint>
            </h2>
            <fieldset
              aria-label="Address history period"
              className="flex rounded-xl bg-card p-1"
            >
              {[7, 30, 90].map((period) => (
                <button
                  key={period}
                  type="button"
                  aria-pressed={days === period}
                  onClick={() => setDays(period)}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground aria-pressed:bg-action-subtle aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {period}D
                </button>
              ))}
            </fieldset>
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">
            24-hour intervals · UTC
          </p>
          <div className="flex min-h-48 flex-1 items-center justify-center">
            {history.isPending ? (
              <SkeletonBar className="h-40 w-full" />
            ) : history.isError ? (
              <button
                type="button"
                className="text-sm text-destructive underline"
                onClick={() => void history.refetch()}
              >
                Retry history
              </button>
            ) : !validSeries ? (
              <MissingApiData description="The API must return one non-negative count for each requested 24-hour interval, with matching timestamps." />
            ) : (
              <AreaChart
                data={points}
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
                    <p>
                      {formatDateTime(entry.timestamp)} –{" "}
                      {formatDateTime(entry.intervalEnd)}
                    </p>
                    <p>
                      {metricNumber(entry.data.newAddresses, 0)} new addresses
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
          <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <dt className="text-sm text-muted-foreground">
                New addresses · {days}D
              </dt>
              <dd className="mt-2 text-xl font-extrabold tabular-nums text-brand">
                {metricNumber(newCount, 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Average per 24H</dt>
              <dd className="mt-2 text-xl font-extrabold tabular-nums text-brand">
                {metricNumber(newCount == null ? null : newCount / days, 0)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
