import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useClockValue } from "@/components/render-clock";
import {
  DASH_LAUNCH_DAY,
  DAY,
  networkStatisticsQuery,
  utcDayStart,
} from "@/lib/dashboard";
import { appStore } from "@/lib/store";
import { ChartDateRange } from "../components/chart-date-range";
import { HistoryPanel, metrics } from "../components/network-history-panel";

export default function DashboardPage() {
  const network = useStore(appStore, (state) => state.network);
  const today = useClockValue(utcDayStart);
  const search = useSearch({ from: "/dashboard" });
  const navigate = useNavigate({ from: "/dashboard" });
  const days = search.days ?? 30;
  const end = search.end ?? today;
  const all = search.range === "all";
  const start = all ? DASH_LAUNCH_DAY : end - days * DAY;
  const hourly = days === 1;
  const step = hourly ? DAY / 24 : DAY;
  const history = useQuery(networkStatisticsQuery(network, end, days, all));
  const entries = new Map(
    history.data?.map((entry) => [Date.parse(entry.timestamp), entry]),
  );
  const firstFeeTime = all
    ? history.data?.reduce<number | undefined>((first, entry) => {
        const time = Date.parse(entry.timestamp);
        return (entry.data.feesPerBlock ?? 0) > 0 &&
          (first === undefined || time < first)
          ? time
          : first;
      }, undefined)
    : undefined;
  const feeStart = firstFeeTime == null ? start : utcDayStart(firstFeeTime);
  const feeDays = (end - feeStart) / DAY;
  const refineFees = all && feeStart > start && feeDays > 0;
  const feeHistory = useQuery({
    ...networkStatisticsQuery(network, end, refineFees ? feeDays : days),
    enabled: refineFees,
  });
  const buckets = all
    ? Array.from(entries, ([time, entry]) => ({ time, entry })).sort(
        (first, second) => first.time - second.time,
      )
    : Array.from({ length: hourly ? 24 : days }, (_, index) => {
        const time = start + index * step;
        return { time, entry: entries.get(time) };
      });
  return (
    <main className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="dash-heading-page font-extrabold text-brand sm:dash-heading-hero">
            Network statistics
          </h1>
          <span className="whitespace-nowrap text-xl font-medium tracking-normal sm:text-2xl">
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year:
                start < Date.UTC(new Date(today).getUTCFullYear(), 0)
                  ? "numeric"
                  : undefined,
              timeZone: "UTC",
            }).formatRange(start, end - 1)}
          </span>
        </div>
        <ChartDateRange
          segmented
          allSelected={all}
          onSelectAll={() =>
            void navigate({ search: { range: "all" }, resetScroll: false })
          }
          value={{ days, end: search.end }}
          today={today}
          onChange={(period) =>
            void navigate({
              search: period.days === 30 && !period.end ? {} : period,
              resetScroll: false,
            })
          }
        />
      </header>
      {history.isError && (
        <p role="alert">
          Could not refresh network history.{" "}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => void history.refetch()}
          >
            Retry
          </button>
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {metrics.map((metric) => (
          <HistoryPanel
            key={metric.title}
            metric={metric}
            rangeEnd={end}
            buckets={
              metric.keys[0] === "feesPerBlock" &&
              refineFees &&
              feeHistory.data?.length
                ? feeHistory.data
                    .map((entry) => ({
                      time: Date.parse(entry.timestamp),
                      entry,
                    }))
                    .sort((first, second) => first.time - second.time)
                : buckets
            }
            hourly={hourly}
            all={all}
            loading={history.isPending}
            failed={history.isError}
          />
        ))}
      </div>
    </main>
  );
}
