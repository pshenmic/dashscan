import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { addressBalanceChartQueryOptions } from "@/lib/api/addresses";
import type { ApiAddressDetail } from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Network } from "@/lib/store";
import { metricDuffs } from "@/themes/dash/lib/home-metrics";
import { AreaChart } from "./area-chart";
import { SkeletonBar } from "./skeleton";

const ranges = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "1Y", days: 365 },
] as const;

export function AddressBalanceChart({
  detail,
  network,
}: {
  detail: ApiAddressDetail;
  network: Network;
}) {
  const [days, setDays] = useState<number>(30);
  const [end, setEnd] = useState<number | null>(null);
  useEffect(() => {
    setEnd(Date.now());
  }, []);
  const query = useQuery({
    ...addressBalanceChartQueryOptions({
      network,
      address: detail.address,
      timestampStart: new Date((end ?? 0) - days * 86_400_000).toISOString(),
      timestampEnd: new Date(end ?? 0).toISOString(),
      intervalsCount: 60,
    }),
    enabled: end !== null,
    staleTime: 60_000,
  });
  const points = (query.data ?? [])
    .flatMap((point) => {
      const timestamp = Date.parse(point.timestamp);
      const balance =
        point.data?.balance == null ? NaN : Number(point.data.balance);
      return Number.isFinite(timestamp) &&
        Number.isSafeInteger(balance) &&
        balance >= 0
        ? [{ timestamp, value: balance / 100_000_000 }]
        : [];
    })
    .sort((first, second) => first.timestamp - second.timestamp);
  return (
    <section
      aria-label="Balance history"
      className="flex min-w-0 flex-col gap-6 rounded-3xl bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-brand/12">
            <img
              src="/icons/dash.svg"
              alt=""
              width={28}
              height={28}
              className="size-7"
            />
          </div>
          <div className="min-w-0">
            <h2 className="mb-2 text-sm text-muted-foreground">
              Current balance (DASH)
            </h2>
            <p
              className="break-words text-2xl font-extrabold tabular-nums sm:text-[32px]"
              title={`${metricDuffs(detail.balance)} DASH`}
            >
              {metricDuffs(detail.balance, 4)}
            </p>
          </div>
        </div>
        <fieldset
          aria-label="Balance history period"
          className="inline-flex rounded-xl bg-action-subtle p-1"
        >
          {ranges.map((range) => (
            <button
              key={range.label}
              type="button"
              aria-pressed={days === range.days}
              onClick={() => {
                setDays(range.days);
                setEnd(Date.now());
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              {range.label}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="flex min-h-64 flex-1 items-center">
        {query.isPending ? (
          <SkeletonBar className="h-64 w-full rounded-xl" />
        ) : query.isError ? (
          <div role="alert" className="w-full text-center text-sm">
            <p>Could not load balance history.</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-2 text-accent underline"
            >
              Retry
            </button>
          </div>
        ) : points.length === 0 ? (
          <p className="w-full text-center text-sm text-muted-foreground">
            No balance history for this period.
          </p>
        ) : (
          <AreaChart
            data={points}
            getKey={(point) => point.timestamp}
            getValue={(point) => point.value}
            getXLabel={(point) =>
              formatDateTime(
                new Date(point.timestamp),
                days === 1
                  ? { hour: "2-digit", minute: "2-digit" }
                  : { month: "short", day: "numeric" },
              )
            }
            formatYLabel={(value) =>
              formatNumber(value, { maximumFractionDigits: 4 })
            }
            renderTooltip={(point) => (
              <>
                <p className="font-semibold">
                  {formatNumber(point.value, { maximumFractionDigits: 8 })} DASH
                </p>
                <p className="text-muted-foreground">
                  {formatDateTime(new Date(point.timestamp))}
                </p>
              </>
            )}
            getValueText={(point) =>
              `${formatNumber(point.value, { maximumFractionDigits: 8 })} DASH`
            }
            tooltipPlacement="point"
            minimumMax={0}
            ariaLabel="Address balance history in DASH"
            className="w-full"
          />
        )}
      </div>
    </section>
  );
}
