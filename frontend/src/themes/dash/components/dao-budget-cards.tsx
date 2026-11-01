import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNow } from "@/components/render-clock";
import { priceQueryOptions } from "@/lib/api/price";
import type {
  ApiBlock,
  ApiChainStats,
  ApiGovernanceBudget,
} from "@/lib/api/types";
import {
  formatCompact,
  formatCompactUsdShort,
  formatDateTime,
  formatDuration,
} from "@/lib/format";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import type { Network } from "@/lib/store";
import { budgetAllocation, daoTiming } from "@/themes/dash/lib/dao-metrics";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { DaoHint } from "./dao-hint";
import { InfoPopover } from "./info-popover";
import { MissingApiData } from "./missing-api-data";

function DaoRing({
  value,
  label,
  large = false,
}: {
  value: number | null;
  label: string;
  large?: boolean;
}) {
  const progress =
    value != null && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : null;
  const size = large ? 120 : 100;
  const strokeWidth = large ? 24 : 16;
  return (
    <div
      role="img"
      aria-label={`${label}: ${progress == null ? "unavailable" : `${metricNumber(progress, 0)}%`}`}
      className="relative shrink-0"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="none"
          stroke="var(--action-subtle)"
          strokeWidth={strokeWidth}
        />
        {progress != null && progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - strokeWidth) / 2}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={progress === 100 ? undefined : `${progress} 100`}
            transform={`translate(${size} 0) scale(-1 1) rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold tabular-nums text-brand">
        {progress == null ? "—" : `${metricNumber(progress, 0)}%`}
      </span>
    </div>
  );
}

function DaoMetric({
  label,
  value,
  icon,
  description,
  children,
}: {
  label: string;
  value: ReactNode;
  icon: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 rounded-3xl bg-foreground/3 px-6 py-4">
      <img
        src={`/icons/home/${icon}.svg`}
        alt=""
        width={24}
        height={24}
        className="size-6"
      />
      <div className="space-y-2">
        <h3 className="dash-body-compact text-foreground/50">
          <DaoHint description={description}>{label}</DaoHint>
        </h3>
        <p className="dash-metric break-words text-brand">{value}</p>
        {children && (
          <div className="dash-label-small text-muted-foreground">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function DaoTimingCards({
  chain,
  latest,
  deadline,
  showMissingDeadline,
}: {
  chain: ApiChainStats | undefined;
  latest: ApiBlock | undefined;
  deadline: string | null | undefined;
  showMissingDeadline: boolean;
}) {
  const now = useNow();
  const timing = daoTiming(chain, latest, deadline, now);
  const countdown = (timestamp: number | null, ended: string) =>
    timestamp == null
      ? "Time unavailable"
      : timestamp <= now
        ? ended
        : `≈ ${formatDuration(timestamp - now)}`;
  return (
    <>
      <div className="flex min-h-[132px] flex-wrap items-center justify-between gap-3 rounded-3xl bg-foreground/3 px-6 py-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="dash-body-compact text-foreground/50">
            <DaoHint description="Estimated voting deadline in UTC. Timing may change as blocks are mined.">
              Voting Deadline
            </DaoHint>
          </h3>
          <p className="dash-metric whitespace-nowrap text-brand">
            {timing.votingDeadline == null
              ? "—"
              : formatDateTime(timing.votingDeadline, {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
          </p>
          <div className="flex items-center gap-1 whitespace-nowrap text-xs">
            <span className="rounded-lg bg-foreground/4 px-2 py-1 text-muted-foreground">
              Time
            </span>
            <span className="text-foreground/32">
              {countdown(timing.votingDeadline, "Awaiting cutoff")}
            </span>
          </div>
        </div>
        <DaoRing
          value={timing.votingProgress}
          label="Estimated voting window elapsed"
        />
      </div>
      <div className="flex min-h-[132px] flex-wrap items-center justify-between gap-3 rounded-3xl bg-foreground/3 px-6 py-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="dash-body-compact text-foreground/50">
            <DaoHint description="Next treasury payout block. The countdown is an estimate, not a scheduled block time.">
              Next Superblock
            </DaoHint>
          </h3>
          <p className="dash-metric whitespace-nowrap text-brand">
            #{metricNumber(chain?.nextSuperblockHeight, 0)}
          </p>
          <div className="flex items-center gap-1 whitespace-nowrap text-xs">
            <span className="rounded-lg bg-foreground/4 px-2 py-1 text-muted-foreground">
              Time
            </span>
            <span className="text-foreground/32">
              {countdown(timing.nextAt, "Awaiting block")}
            </span>
          </div>
        </div>
        <DaoRing
          value={timing.blockProgress}
          label="Superblock cycle completed"
        />
      </div>
      {showMissingDeadline && timing.votingDeadline == null && (
        <MissingApiData
          compact
          description="This backend does not provide the voting deadline."
        />
      )}
    </>
  );
}

export function DaoBudgetCards({
  network,
  budget,
  proposalCount,
  proposalsPending,
}: {
  network: Network;
  budget: UseQueryResult<ApiGovernanceBudget>;
  proposalCount: number | null;
  proposalsPending: boolean;
}) {
  const chain = useQuery(homeChainQueryOptions(network));
  const blocks = useQuery(homeBlocksQueryOptions(network));
  const price = useQuery(priceQueryOptions({ network, currency: "usd" }));
  const latest = [...(blocks.data?.resultSet ?? [])].sort(
    (first, second) => second.height - first.height,
  )[0];
  const currentBudget = budget.isError ? undefined : budget.data;
  const allocation = budgetAllocation(currentBudget);
  const usd = (amount: number | null | undefined) =>
    amount != null &&
    Number.isFinite(amount) &&
    price.data?.usd != null &&
    Number.isFinite(price.data.usd) &&
    !price.isError
      ? `≈ ${formatCompactUsdShort(amount * price.data.usd)}`
      : "—";

  return (
    <>
      {" "}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-h-[232px] flex-1 flex-col gap-8 rounded-3xl bg-foreground/3 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="dash-body">Budget</h3>
            <InfoPopover label="About the cycle budget">
              The ring shows the share allocated to proposals with enough votes
              and funding capacity. This is a projection, not a confirmed
              payout.
            </InfoPopover>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 xl:gap-4">
            <DaoRing
              large
              value={allocation?.percent ?? null}
              label="Projected budget allocation"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="dash-body-compact text-foreground/50">Total</p>
              <p className="whitespace-nowrap text-xl font-extrabold text-brand">
                <DaoHint
                  description={
                    <>
                      {metricNumber(currentBudget?.totalBudget, 8)} DASH
                      available this cycle.
                    </>
                  }
                >
                  {budget.isPending
                    ? "…"
                    : currentBudget?.totalBudget == null
                      ? "—"
                      : `≈ ${formatCompact(currentBudget.totalBudget)}`}
                  <span className="ml-1 text-sm font-medium">DASH</span>
                </DaoHint>
              </p>
              <p className="dash-label-small text-brand/64">
                USD {usd(currentBudget?.totalBudget)}
              </p>
            </div>
          </div>
          {budget.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Budget unavailable.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void budget.refetch()}
              >
                Try again
              </button>
            </p>
          ) : !budget.isPending && !allocation ? (
            <MissingApiData
              compact
              description="The backend does not provide a valid combined votes-and-funding allocation for this cycle."
            />
          ) : null}
        </div>
        <DaoTimingCards
          chain={chain.isError ? undefined : chain.data}
          latest={blocks.isError ? undefined : latest}
          deadline={currentBudget?.votingDeadline}
          showMissingDeadline={!budget.isPending && !budget.isError}
        />
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-3 xl:flex xl:flex-col">
        <DaoMetric
          icon="minimum-votes"
          label="Vote Threshold"
          description="Required weighted Net Yes (Yes − No). Passing the threshold does not guarantee payment."
          value={
            <>
              {metricNumber(currentBudget?.requiredVotes, 0)}{" "}
              <span className="font-medium">Votes</span>
            </>
          }
        >
          <div className="flex min-h-6 items-center gap-1">
            <span className="rounded-lg bg-foreground/4 px-2 py-1 text-xs text-muted-foreground">
              Net Yes
            </span>
            {!budget.isPending &&
              !budget.isError &&
              currentBudget?.requiredVotes == null && (
                <MissingApiData
                  compact
                  description="The API does not expose the required vote threshold."
                />
              )}
          </div>
        </DaoMetric>
        <DaoMetric
          icon="proposals"
          label="Active Proposals"
          description="Proposals with an active payment period. Not all are eligible for the next superblock."
          value={
            <>
              {proposalsPending ? "…" : metricNumber(proposalCount, 0)}{" "}
              <span className="font-medium">Proposals</span>
            </>
          }
        >
          <div className="flex min-h-6 items-center gap-1">
            <span className="rounded-lg bg-foreground/4 px-2 py-1 text-xs text-muted-foreground">
              24H
            </span>
            <MissingApiData
              inline
              description="The API does not provide the change in active proposals over the last 24 hours."
            />
          </div>
        </DaoMetric>
        <DaoMetric
          icon="remaining-budget"
          label="Unallocated"
          description="Budget remaining after projected funding, not a treasury account balance."
          value={
            <>
              {metricNumber(allocation?.remaining)}{" "}
              <span className="font-medium">DASH</span>
            </>
          }
        >
          <div className="flex min-h-6 items-center gap-1 whitespace-nowrap text-xs">
            <span className="rounded-lg bg-foreground/4 px-2 py-1 text-muted-foreground">
              USD
            </span>
            <span className="font-extrabold text-brand/64">
              {usd(allocation?.remaining)}
            </span>
          </div>
        </DaoMetric>
      </div>
    </>
  );
}
