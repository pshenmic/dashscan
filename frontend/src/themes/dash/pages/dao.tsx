import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { Search } from "lucide-react";
import { useState } from "react";
import { useClockValue } from "@/components/render-clock";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { budgetQueryOptions } from "@/lib/api/governance";
import { formatDateTime, formatNumber } from "@/lib/format";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { InfoPopover } from "@/themes/dash/components/info-popover";
import { budgetAllocation, daoTiming } from "@/themes/dash/lib/dao-metrics";
import {
  type PaymentPeriod,
  ProposalBadges,
  ProposalsSection,
  useListedProposals,
} from "./proposals";

function funds(value: number | null | undefined, maximumFractionDigits = 2) {
  return value == null
    ? "—"
    : `${formatNumber(value, { maximumFractionDigits })} DASH`;
}

export default function BudgetPage() {
  const network = useStore(appStore, (state) => state.network);
  const proposals = useListedProposals();
  const [period, setPeriod] = useState<PaymentPeriod | null>(null);
  const [search, setSearch] = useState("");
  const budget = useQuery(budgetQueryOptions({ network }));
  const chain = useQuery(homeChainQueryOptions(network));
  const blocks = useQuery(homeBlocksQueryOptions(network));
  const now = useClockValue((time) => Math.floor(time / 60_000) * 60_000);
  const nextAt = daoTiming(
    chain.data,
    blocks.data?.resultSet[0],
    budget.data?.votingDeadline,
    now,
  ).nextAt;
  const data = budget.data;
  const allocation = budgetAllocation(data);
  const deadline = Date.parse(data?.votingDeadline ?? "");
  const height = chain.data?.nextSuperblockHeight;
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="relative flex flex-col gap-2 lg:pr-[calc(30%+1.5rem)]">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="dash-heading-page font-extrabold text-brand sm:dash-heading-hero">
            Budget Proposals
          </h1>
          <span className="text-2xl font-semibold tabular-nums sm:text-3xl">
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProposalBadges
            rows={proposals.rows}
            selected={period}
            onChange={setPeriod}
          />
          <dl
            aria-label="Governance cycle"
            className="flex flex-wrap items-center gap-2 text-sm [&>div]:inline-flex [&>div]:flex-wrap [&>div]:items-baseline [&>div]:gap-x-1.5 [&>div]:rounded-full [&>div]:bg-secondary [&>div]:px-3 [&>div]:py-1"
          >
            <div>
              <dt className="text-sm text-muted-foreground">Requested</dt>
              <dd className="font-semibold tabular-nums">
                {funds(data?.totalRequested)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                <InfoPopover
                  trigger="Projected payout"
                  label="Projected payout details"
                >
                  Unallocated: {funds(allocation?.remaining)}. This is a
                  projection, not a confirmed payment.
                </InfoPopover>
              </dt>
              <dd className="font-semibold tabular-nums">
                {funds(allocation?.allocated)}
                {allocation && data?.enoughVotesAndFundsCount != null && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    · {formatNumber(data.enoughVotesAndFundsCount)}{" "}
                    {data.enoughVotesAndFundsCount === 1
                      ? "proposal"
                      : "proposals"}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                <InfoPopover
                  trigger="Est. voting deadline"
                  label="Voting deadline and next superblock"
                >
                  Next superblock:{" "}
                  {height == null ? "—" : `#${formatNumber(height)}`}.{" "}
                  {nextAt == null
                    ? "Time unavailable."
                    : nextAt <= now
                      ? "Awaiting block."
                      : `Estimated: ${formatDateTime(nextAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}.`}
                </InfoPopover>
              </dt>
              <dd className="font-semibold">
                {Number.isFinite(deadline) ? (
                  <time dateTime={new Date(deadline).toISOString()}>
                    {formatDateTime(deadline, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </div>
        <label className="mt-2 grid gap-2 font-semibold lg:absolute lg:inset-e-0 lg:top-0 lg:mt-0 lg:w-[30%]">
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
        search={search}
        period={period}
        threshold={data?.requiredVotes}
      />
    </main>
  );
}
