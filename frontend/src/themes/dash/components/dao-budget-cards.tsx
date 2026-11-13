import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Pie, PieChart } from "recharts";
import { useNow } from "@/components/render-clock";
import { proposalStatsQueryOptions } from "@/lib/api/governance";
import { priceQueryOptions } from "@/lib/api/price";
import type {
  ApiBlock,
  ApiChainStats,
  ApiGovernanceBudget,
} from "@/lib/api/types";
import {
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
  estimated = false,
}: {
  value: number | null;
  label: string;
  large?: boolean;
  estimated?: boolean;
}) {
  const progress =
    value != null && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : null;
  const size = large ? 120 : 100;
  const segments =
    progress == null
      ? [{ name: "Unavailable", value: 100, fill: "var(--action-subtle)" }]
      : [
          { name: "Completed", value: progress, fill: "var(--brand)" },
          {
            name: "Remaining",
            value: 100 - progress,
            fill: "var(--action-subtle)",
          },
        ];
  const split = progress != null && progress > 0 && progress < 100;
  return (
    <div
      className="relative shrink-0 rounded-full bg-card [&_button]:rounded-full"
      style={{ width: size, height: size }}
    >
      <div aria-hidden="true" className="pointer-events-none">
        <PieChart width={size} height={size} accessibilityLayer={false}>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={Math.round(size * 0.3375)}
            outerRadius={size / 2 - 1}
            startAngle={90}
            endAngle={-270}
            cornerRadius={split ? 4 : 0}
            paddingAngle={split ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
            rootTabIndex={-1}
          />
        </PieChart>
      </div>
      <div className="absolute inset-0">
        <DaoHint
          label={`${label}: ${progress == null ? "unavailable" : `${estimated ? "approximately " : ""}${metricNumber(progress, 0)}%`}`}
          description={label}
        >
          <span
            className="flex items-center justify-center text-sm font-extrabold tabular-nums text-accent"
            style={{ width: size, height: size }}
          >
            {progress == null
              ? "—"
              : `${estimated ? "≈ " : ""}${metricNumber(progress, 0)}%`}
          </span>
        </DaoHint>
      </div>
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
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 rounded-3xl dash-home-panel px-6 py-4">
      <img
        src={`/icons/home/${icon}.svg`}
        alt=""
        width={24}
        height={24}
        className="size-6"
      />
      <div className="space-y-2">
        <h3 className="dash-body-compact text-muted-foreground">
          <DaoHint description={description}>{label}</DaoHint>
        </h3>
        <p className="dash-metric break-words text-accent">{value}</p>
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
      <div className="flex min-h-[132px] flex-wrap items-center justify-between gap-3 rounded-3xl dash-home-panel px-6 py-4">
        <div className="min-w-[170px] flex-1 space-y-2">
          <h3 className="dash-body-compact text-muted-foreground">
            <DaoHint description="Estimated cutoff for the next funding cycle, supplied by the API. This is not the proposal expiry date. Timing may change as blocks are mined.">
              Voting Deadline
            </DaoHint>
          </h3>
          <p className="dash-metric whitespace-nowrap text-accent">
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
            <span className="text-muted-foreground">
              {countdown(timing.votingDeadline, "Awaiting cutoff")}
            </span>
          </div>
        </div>
        <DaoRing
          value={timing.votingProgress}
          estimated
          label="Estimated voting window elapsed, not voter turnout. Calculated from the API deadline and estimated cycle start; timing is not a protocol guarantee."
        />
      </div>
      <div className="flex min-h-[132px] flex-wrap items-center justify-between gap-3 rounded-3xl dash-home-panel px-6 py-4">
        <div className="min-w-[170px] flex-1 space-y-2">
          <h3 className="dash-body-compact text-muted-foreground">
            <DaoHint description="Next treasury payout block. The countdown is an estimate, not a scheduled block time.">
              Next Superblock
            </DaoHint>
          </h3>
          <p className="dash-metric whitespace-nowrap text-accent">
            #{metricNumber(chain?.nextSuperblockHeight, 0)}
          </p>
          <div className="flex items-center gap-1 whitespace-nowrap text-xs">
            <span className="rounded-lg bg-foreground/4 px-2 py-1 text-muted-foreground">
              Time
            </span>
            <span className="text-muted-foreground">
              {countdown(timing.nextAt, "Awaiting block")}
            </span>
          </div>
        </div>
        <DaoRing
          value={timing.blockProgress}
          label="Share of blocks mined in the current superblock cycle, not voter turnout."
        />
      </div>
      {showMissingDeadline && timing.votingDeadline == null && (
        <MissingApiData
          label="Unavailable"
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
  const proposalStats = useQuery(proposalStatsQueryOptions({ network }));
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
      <div className="grid min-w-0 gap-4 lg:grid-cols-3 min-[1440px]:flex min-[1440px]:flex-col">
        <div className="flex min-h-[232px] flex-1 flex-col gap-8 rounded-3xl dash-home-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="dash-body">
              <InfoPopover
                label="About the cycle budget"
                trigger="Cycle Budget"
              >
                The ring shows the share allocated to proposals with enough
                votes and funding capacity. This is a projection, not a
                confirmed payout.
              </InfoPopover>
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 xl:gap-4">
            <DaoRing
              large
              value={allocation?.percent ?? null}
              label="Projected budget allocation"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="dash-body-compact text-muted-foreground">Total</p>
              <p className="whitespace-nowrap text-xl font-extrabold text-accent">
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
                      : metricNumber(currentBudget.totalBudget)}
                  <span className="ml-1 text-sm font-medium">DASH</span>
                </DaoHint>
              </p>
              {network === "mainnet" && (
                <p className="dash-label-small text-accent">
                  USD {usd(currentBudget?.totalBudget)}
                </p>
              )}
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
              label="Unavailable"
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
      <div className="grid min-w-0 gap-4 sm:grid-cols-3 min-[1440px]:flex min-[1440px]:flex-col">
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
                  label="Unavailable"
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
              {proposalsPending && proposalStats.isPending
                ? "…"
                : metricNumber(
                    proposalStats.data?.active ?? proposalCount,
                    0,
                  )}{" "}
              <span className="font-medium">Proposals</span>
            </>
          }
        >
          {currentBudget?.enoughVotesAndFundsCount != null && (
            <DaoHint description="Proposals that currently meet the vote threshold and fit the next cycle’s budget. This is projected funding, not confirmed payouts.">
              Projected funding ·{" "}
              {metricNumber(currentBudget.enoughVotesAndFundsCount, 0)}
            </DaoHint>
          )}
        </DaoMetric>
        <DaoMetric
          icon="remaining-budget"
          label="Unallocated"
          description="Budget remaining after projected funding, not a treasury account balance."
          value={
            <DaoHint
              description={`${metricNumber(allocation?.remaining, 8)} DASH remaining after projected funding. Unallocated funds are not created, rather than carried over to the next cycle.`}
            >
              <span>
                {metricNumber(allocation?.remaining)}{" "}
                <span className="font-medium">DASH</span>
              </span>
            </DaoHint>
          }
        >
          {network === "mainnet" && (
            <div className="flex min-h-6 items-center gap-1 whitespace-nowrap text-xs">
              <span className="rounded-lg bg-foreground/4 px-2 py-1 text-muted-foreground">
                USD
              </span>
              <span className="font-extrabold text-accent">
                {usd(allocation?.remaining)}
              </span>
            </div>
          )}
        </DaoMetric>
      </div>
    </>
  );
}
