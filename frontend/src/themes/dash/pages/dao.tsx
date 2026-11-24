import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Search } from "lucide-react";
import { useState } from "react";
import { useClockValue } from "@/components/render-clock";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { blockRewardQueryOptions, blocksQueryOptions } from "@/lib/api/blocks";
import { budgetQueryOptions } from "@/lib/api/governance";
import {
  DUFFS_PER_DASH,
  formatDateTime,
  formatDuration,
  formatNumber,
} from "@/lib/format";
import { homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { BlockAge } from "@/themes/dash/components/block-age";
import { ProposalsSection, useListedProposals } from "./proposals";

function funds(value: number | null | undefined, maximumFractionDigits = 2) {
  return value == null
    ? "—"
    : `${formatNumber(value, { maximumFractionDigits })} DASH`;
}

function NextPayoutTime({ timestamp }: { timestamp: number }) {
  const minute = useClockValue((now) => Math.floor((timestamp - now) / 60_000));
  if (!Number.isFinite(timestamp)) return "—";
  const remaining =
    minute < 0
      ? "Awaiting block"
      : minute === 0
        ? "<1m"
        : `~${formatDuration(minute * 60_000)}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Estimated next superblock: ${remaining}`}
          className="rounded-sm font-medium tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
        >
          {remaining}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <time dateTime={new Date(timestamp).toISOString()}>
          Estimated ·{" "}
          {formatDateTime(timestamp, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
            timeZoneName: "short",
          })}
        </time>
      </TooltipContent>
    </Tooltip>
  );
}

export default function BudgetPage() {
  const network = useStore(appStore, (state) => state.network);
  const proposals = useListedProposals();
  const [search, setSearch] = useState("");
  const budget = useQuery({
    ...budgetQueryOptions({ network }),
    refetchInterval: 30_000,
  });
  const chain = useQuery(homeChainQueryOptions(network));
  const data = budget.data;
  const projectedCount = data?.enoughVotesAndFundsCount;
  const start = chain.data?.latestSuperblockHeight;
  const historyOptions = blocksQueryOptions({
    network,
    superblock: true,
    limit: 2,
    order: "desc",
  });
  const history = useQuery({
    ...historyOptions,
    queryKey: [...historyOptions.queryKey, start],
    enabled: start != null,
    staleTime: Infinity,
    refetchInterval: (query) =>
      query.state.data?.resultSet[0]?.height === start ? false : 30_000,
  });
  const previousBlock = history.data?.resultSet.find(
    (block) => start != null && block.height < start,
  );
  const previous = previousBlock?.height;
  const lastBlock = history.data?.resultSet.find(
    (block) => block.height === start,
  );
  const previousReward = useQuery({
    ...blockRewardQueryOptions({ network, height: previous }),
    refetchInterval: false,
  });
  const lastReward = useQuery({
    ...blockRewardQueryOptions({ network, height: start }),
    refetchInterval: false,
  });
  const end = chain.data?.nextSuperblockHeight;
  const lastTime = Date.parse(lastBlock?.timestamp ?? "");
  const previousTime = Date.parse(previousBlock?.timestamp ?? "");
  const nextTime =
    end != null &&
    start != null &&
    previous != null &&
    end > start &&
    lastTime > previousTime
      ? lastTime +
        ((lastTime - previousTime) * (end - start)) / (start - previous)
      : Number.NaN;
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="grid items-center gap-4 sm:px-3 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:grid-rows-[auto_auto] lg:gap-y-0 lg:px-5 lg:py-2">
        <ol
          className="relative flex min-w-0 gap-6 overflow-x-auto px-1 py-2 lg:row-span-2 lg:grid lg:grid-cols-3 lg:grid-rows-subgrid lg:gap-y-0 lg:py-0"
          aria-label="Budget cycle"
        >
          {[
            {
              label: "Previous payout",
              height: previous,
              treasury: previousReward.data?.treasury,
              timestamp: previousBlock?.timestamp,
            },
            {
              label: "Last payout",
              height: start,
              treasury: lastReward.data?.treasury,
              timestamp: lastBlock?.timestamp,
            },
            { label: "Next payout", height: end, upcoming: true },
          ].map(({ label, height, treasury, timestamp, upcoming }) => (
            <li
              key={label}
              className="min-w-max flex-1 lg:row-span-2 lg:grid lg:grid-rows-subgrid"
            >
              <div className="flex min-h-[74px] flex-col justify-between gap-2 rounded-xl bg-card p-3 tabular-nums text-foreground shadow-card">
                <span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium">
                  <span
                    aria-hidden="true"
                    className="h-[11px] w-[10px] bg-current [mask:url('/icons/home/timeline-block.svg')_center/contain_no-repeat]"
                  />
                  {label}
                  {!upcoming && height != null ? (
                    <Link
                      to="/blocks/$hashOrHeight"
                      params={{ hashOrHeight: String(height) }}
                      aria-label={`View block #${formatNumber(height)}`}
                      className="ms-auto rounded-sm text-accent no-underline focus-visible:outline-2 focus-visible:outline-current"
                    >
                      #{formatNumber(height)}
                    </Link>
                  ) : (
                    <span className="ms-auto text-muted-foreground">
                      {height == null ? "—" : `#${formatNumber(height)}`}
                    </span>
                  )}
                </span>
                {!upcoming ? (
                  <p className="flex items-baseline justify-between gap-2 text-xs">
                    <strong className="text-sm font-semibold">
                      {funds(
                        treasury == null ? null : treasury / DUFFS_PER_DASH,
                        8,
                      )}
                    </strong>
                  </p>
                ) : (
                  <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <strong className="text-sm font-semibold text-foreground">
                      <span className="sr-only">Projected payout: </span>
                      {funds(data?.enoughVotesAndFundsTotal)}
                    </strong>
                    {projectedCount != null && (
                      <span>
                        {formatNumber(projectedCount)}{" "}
                        {projectedCount === 1 ? "proposal" : "proposals"}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div
                data-upcoming={upcoming || undefined}
                className="dash-timeline-track relative mt-2 pt-3 text-center text-[10px] text-muted-foreground after:absolute after:left-1/2 after:top-0 after:size-2 after:-translate-x-1/2 after:rounded-full after:bg-brand/70 [&_button]:text-center"
              >
                {upcoming ? (
                  <NextPayoutTime timestamp={nextTime} />
                ) : timestamp ? (
                  <BlockAge timestamp={timestamp} />
                ) : (
                  "—"
                )}
              </div>
            </li>
          ))}
        </ol>
        <label className="mx-1 min-w-0 font-semibold lg:col-start-2 lg:row-start-1">
          <span className="sr-only">
            Find a proposal by name, hash or payment address
          </span>
          <span className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 focus-within:outline-2 focus-within:outline-ring">
            <Search
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <input
              type="search"
              placeholder="Find a proposal"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full min-w-0 bg-transparent text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground"
            />
          </span>
        </label>
      </header>
      {budget.isError && (
        <p role="alert">
          Budget unavailable.{" "}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => void budget.refetch()}
          >
            Try again
          </button>
        </p>
      )}
      <ProposalsSection
        {...proposals}
        heading={
          <h1 className="dash-heading-section flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-extrabold text-brand">Budget</span>
            <span className="tabular-nums">
              {data?.totalBudget == null ? (
                "—"
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Total cycle budget: ${funds(data.totalBudget, 8)}`}
                      className="inline-flex items-baseline gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {formatNumber(data.totalBudget, {
                        maximumFractionDigits: 2,
                      })}
                      <span className="text-sm font-medium text-muted-foreground">
                        DASH
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Total cycle budget: {funds(data.totalBudget, 8)}
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
          </h1>
        }
        search={search}
        threshold={data?.requiredVotes}
        totalRequested={data?.totalRequested}
      />
    </main>
  );
}
