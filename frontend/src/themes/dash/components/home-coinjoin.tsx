import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { transactionsBreakdown24hQueryOptions } from "@/lib/api/stats";
import { appStore } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { HomeIcon } from "./home-icon";
import { MissingApiData } from "./missing-api-data";

export function HomeCoinJoin() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const stats = useQuery({
    ...transactionsBreakdown24hQueryOptions({ network }),
    refetchInterval: 30_000,
  });
  const count = stats.data?.coinjoin;
  const hasCount = count != null && Number.isSafeInteger(count) && count >= 0;

  return (
    <section
      aria-labelledby={titleId}
      className="grid items-center gap-8 rounded-3xl bg-card p-4 sm:p-8 lg:rounded-[48px] xl:grid-cols-[minmax(0,293fr)_minmax(0,436fr)_minmax(0,455fr)] xl:gap-16"
    >
      <div className="min-w-0 xl:order-3">
        <p className="text-xl font-medium text-muted-foreground">Dash Chain</p>
        <h2
          id={titleId}
          className="dash-heading-page mt-2 sm:dash-heading-hero"
        >
          <span className="font-extrabold text-brand">CoinJoin</span> Stats
        </h2>
        <p className="dash-body mt-3 text-foreground/50">
          Explore CoinJoin transactions on the Dash network and track indexed
          mixing activity.
        </p>
        <Link
          to="/transactions"
          search={{ coinjoin: true }}
          className="dash-home-action mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full bg-action-subtle py-2 pl-6 pr-2 text-brand hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Explore CoinJoin Transactions
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
            <HomeIcon name="explore" />
          </span>
        </Link>
      </div>
      <div className="flex min-w-0 flex-col gap-6 self-stretch xl:order-1 xl:min-h-[316px]">
        <div>
          <h3 className="dash-heading-section">Active Sessions</h3>
          <div className="mt-2">
            <MissingApiData
              inline
              description="The API does not expose live CoinJoin sessions, their duration, or participant counts. Indexed transactions are not active mixing sessions."
            />
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-3">
          <h4 className="text-sm font-medium leading-4 text-foreground/50">
            Transactions · 24H
          </h4>
          {stats.isError ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              Transaction count unavailable.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void stats.refetch()}
              >
                Try again
              </button>
            </p>
          ) : stats.isPending ? (
            <p className="dash-body-compact text-muted-foreground">Loading…</p>
          ) : hasCount ? (
            <p className="text-sm font-extrabold tabular-nums text-brand">
              {metricNumber(count, 0)}
            </p>
          ) : (
            <MissingApiData
              compact
              description="This backend does not provide the 24-hour CoinJoin transaction count."
            />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-8 self-stretch xl:order-2 xl:min-h-[316px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="text-base font-medium leading-4">Mixed amount</h3>
            <div className="flex items-center gap-4">
              <p className="whitespace-nowrap text-[32px] font-extrabold leading-[1.0813]">
                — <span className="text-base font-medium">DASH</span>
              </p>
              <MissingApiData
                inline
                className="whitespace-nowrap"
                description="Mixed DASH volume and its change compared with the previous week are not exposed by the API."
              />
            </div>
            <p className="text-sm font-medium leading-4 text-foreground/48">
              Compared to last <strong className="font-extrabold">week</strong>
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="About the mixed amount"
                className="size-6 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
              >
                <img
                  src="/icons/home/info.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 dark:invert"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-w-[calc(100vw-2rem)] text-sm">
              The transaction count cannot be converted into a mixed DASH
              amount. A complete volume series and a defined comparison period
              are needed to display this chart and its weekly change.
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex min-h-[164px] flex-1 flex-col justify-center">
          <MissingApiData description="Mixed DASH volume, its history, and the change compared with the previous week are not exposed by the API." />
        </div>
      </div>
    </section>
  );
}
