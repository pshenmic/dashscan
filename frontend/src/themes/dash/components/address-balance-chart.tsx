import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { useState } from "react";
import { useClockValue } from "@/components/render-clock";
import { addressBalanceChartQueryOptions } from "@/lib/api/addresses";
import type { ApiAddressDetail } from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Network } from "@/lib/store";
import { AreaChart } from "./area-chart";
import { ChartDateRange, type ChartPeriod } from "./chart-date-range";
import { InfoPopover } from "./info-popover";
import { SkeletonBar } from "./skeleton";

const DAY_MS = 86_400_000;

export function AddressBalanceChart({
  detail,
  network,
}: {
  detail: ApiAddressDetail;
  network: Network;
}) {
  const hydrated = useHydrated();
  const today = useClockValue((now) => Math.floor(now / DAY_MS) * DAY_MS);
  const [period, setPeriod] = useState<ChartPeriod>({ days: 30 });
  const end = period.end ?? today;
  const query = useQuery({
    ...addressBalanceChartQueryOptions({
      network,
      address: detail.address,
      timestampStart: new Date(end - period.days * DAY_MS).toISOString(),
      timestampEnd: new Date(end).toISOString(),
      intervalsCount: 60,
    }),
    enabled: hydrated,
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
      className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-4 sm:p-5 lg:self-center"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold">
            <InfoPopover label="Balance history" trigger="Balance history">
              Confirmed balance in DASH. Mempool changes are not included.
            </InfoPopover>
          </h2>
        </div>
        <ChartDateRange value={period} today={today} onChange={setPeriod} />
      </div>
      <div className="flex min-h-48 items-center">
        {query.isPending ? (
          <SkeletonBar className="h-48 w-full rounded-xl" />
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
            height={192}
            compactHeight={192}
            data={points}
            getKey={(point) => point.timestamp}
            getValue={(point) => point.value}
            getXLabel={(point) =>
              formatDateTime(
                new Date(point.timestamp),
                period.days === 1
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
