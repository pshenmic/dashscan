import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useId } from "react";
import { useClockValue, useNow } from "@/components/render-clock";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  budgetQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import { priceQueryOptions } from "@/lib/api/price";
import type {
  ApiBlock,
  ApiChainStats,
  ApiGovernanceObject,
} from "@/lib/api/types";
import {
  formatCompactUsdShort,
  formatDateTime,
  formatDuration,
} from "@/lib/format";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import {
  activeProposals,
  budgetAllocation,
  daoTiming,
} from "@/themes/dash/lib/dao-metrics";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { HomeIcon } from "./home-icon";
import { HomeTable } from "./home-table";
import { MissingApiData } from "./missing-api-data";

function DaoInfo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
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
        {children}
      </PopoverContent>
    </Popover>
  );
}

function DaoRing({
  value,
  label,
  large = false,
}: {
  value: number | null;
  label: string;
  large?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`${label}: ${value == null ? "unavailable" : `${metricNumber(value, 0)}%`}`}
      className={`relative shrink-0 rounded-full bg-action-subtle ${large ? "size-[120px]" : "size-[100px]"}`}
      style={
        value == null
          ? undefined
          : {
              background: `conic-gradient(var(--brand) ${value}%, var(--action-subtle) 0)`,
            }
      }
    >
      <div
        className={`absolute rounded-full bg-card ${large ? "inset-5" : "inset-3"}`}
      >
        <div className="flex size-full items-center justify-center rounded-full bg-foreground/3 text-sm font-extrabold text-brand">
          {large ? null : value == null ? "—" : `${metricNumber(value, 0)}%`}
        </div>
      </div>
    </div>
  );
}

function DaoVotes({ proposal }: { proposal: ApiGovernanceObject }) {
  return (
    <div className="flex gap-1 whitespace-nowrap text-[10px]">
      <span className="rounded-full border border-action-subtle bg-action-subtle px-2 py-1">
        <strong>{metricNumber(proposal.yesCount, 0)}</strong> Yes
      </span>
      <span className="rounded-full border border-border bg-foreground/12 px-2 py-1">
        <strong>{metricNumber(proposal.noCount, 0)}</strong> No
      </span>
    </div>
  );
}

function ProposalName({
  proposal,
  rank,
}: {
  proposal: ApiGovernanceObject;
  rank?: number;
}) {
  const name = proposal.name || proposal.hash || "Unnamed proposal";
  return (
    <div className="flex w-0 min-w-full items-center gap-2">
      {rank != null ? (
        <span
          className={`flex size-[22px] shrink-0 items-center justify-center rounded-lg text-[10px] ${rank === 1 ? "bg-brand text-primary-foreground" : rank === 2 ? "bg-brand/64 text-primary-foreground" : "bg-action-subtle text-brand"}`}
        >
          {rank}
        </span>
      ) : (
        <span
          className="flex size-[22px] shrink-0 items-center justify-center"
          title={
            proposal.enoughVotes == null
              ? "Vote threshold status unavailable"
              : proposal.enoughVotes
                ? "Vote threshold reached; funding is not guaranteed"
                : "Vote threshold not reached"
          }
        >
          {proposal.enoughVotes ? (
            <img
              src="/icons/home/proposal-passing.svg"
              alt="Vote threshold reached"
              width={22}
              height={22}
            />
          ) : proposal.enoughVotes === false ? (
            <span className="flex size-[22px] items-center justify-center rounded-lg bg-foreground/24">
              <img
                src="/icons/home/proposal-not-passing.svg"
                alt="Vote threshold not reached"
                width={9}
                height={9}
              />
            </span>
          ) : (
            "—"
          )}
        </span>
      )}
      {proposal.hash ? (
        <Link
          to="/dao/$hash"
          params={{ hash: proposal.hash }}
          title={name}
          className="min-w-0 flex-1 truncate font-extrabold hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          {name}
        </Link>
      ) : (
        <span className="min-w-0 truncate">{name}</span>
      )}
    </div>
  );
}

function proposalDate(epoch: number | null) {
  return epoch == null
    ? "—"
    : formatDateTime(epoch * 1000, {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
}

function DaoMetric({
  label,
  value,
  icon,
  children,
}: {
  label: string;
  value: ReactNode;
  icon: string;
  children: ReactNode;
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
        <h3 className="dash-body-compact text-foreground/50">{label}</h3>
        <p className="dash-metric break-words text-brand">{value}</p>
        <div className="dash-label-small text-muted-foreground">{children}</div>
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
            Voting Closes
          </h3>
          <p className="dash-metric text-brand">
            {timing.votingDeadline == null
              ? "—"
              : formatDateTime(timing.votingDeadline, {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
          </p>
          <p className="dash-label-small text-muted-foreground">
            {countdown(timing.votingDeadline, "Estimated deadline reached")}
          </p>
          <span className="dash-label-small text-muted-foreground">
            Estimated · UTC
          </span>
        </div>
        <DaoRing
          value={timing.votingProgress}
          label="Estimated voting window elapsed"
        />
      </div>
      <div className="flex min-h-[132px] flex-wrap items-center justify-between gap-3 rounded-3xl bg-foreground/3 px-6 py-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="dash-body-compact text-foreground/50">
            Next Superblock
          </h3>
          <p className="dash-metric break-words text-brand">
            #{metricNumber(chain?.nextSuperblockHeight, 0)}
          </p>
          <p className="dash-label-small text-muted-foreground">
            {countdown(timing.nextAt, "Awaiting superblock")}
          </p>
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

export function HomeDao() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const proposals = useQuery({
    ...proposalsQueryOptions({ network, proposalType: "all" }),
    refetchInterval: 60_000,
  });
  const proposalTime = useClockValue((now) =>
    (proposals.data ?? []).reduce((boundary, proposal) => {
      const start = (proposal.startEpoch ?? Number.NaN) * 1000;
      const end = (proposal.endEpoch ?? Number.NaN) * 1000;
      return Math.max(boundary, start <= now ? start : 0, end <= now ? end : 0);
    }, 0),
  );
  const budget = useQuery({
    ...budgetQueryOptions({ network }),
    refetchInterval: 60_000,
  });
  const chain = useQuery(homeChainQueryOptions(network));
  const blocks = useQuery(homeBlocksQueryOptions(network));
  const price = useQuery(priceQueryOptions({ network, currency: "usd" }));
  const rows = activeProposals(
    proposals.isError ? undefined : proposals.data,
    proposalTime,
  );
  const latest = [...(blocks.data?.resultSet ?? [])].sort(
    (first, second) => second.height - first.height,
  )[0];
  const currentBudget = budget.isError ? undefined : budget.data;
  const allocation = budgetAllocation(currentBudget);
  const totalSubmitted = proposals.data?.filter(
    (proposal) => proposal.objectType === "Proposal",
  ).length;
  const usd = (amount: number | null | undefined) =>
    amount != null &&
    Number.isFinite(amount) &&
    price.data?.usd != null &&
    Number.isFinite(price.data.usd) &&
    !price.isError
      ? `≈ ${formatCompactUsdShort(amount * price.data.usd)}`
      : "—";
  const proposalState = proposals.isError ? (
    <p role="alert" className="text-sm text-destructive">
      Could not load proposals.{" "}
      <button
        type="button"
        className="underline"
        onClick={() => void proposals.refetch()}
      >
        Try again
      </button>
    </p>
  ) : proposals.isPending ? (
    <p className="text-sm text-muted-foreground">Loading proposals…</p>
  ) : !rows.length ? (
    <p className="text-sm text-muted-foreground">No active proposals found.</p>
  ) : null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-10 rounded-3xl bg-card p-4 sm:p-8 lg:gap-16 lg:rounded-[48px]"
    >
      <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,745fr)_minmax(0,503fr)] xl:gap-16">
        <div className="relative order-2 min-w-0 xl:order-1 xl:h-[243px]">
          <div className="flex items-center justify-between gap-3 px-3 pb-5 xl:mx-[66px] xl:px-6 xl:pt-6">
            <h3 className="dash-body">Proposals Leaderboard</h3>
            <DaoInfo label="About the proposals leaderboard">
              Active proposals ranked by net yes votes (yes minus no). Amounts
              are requested payments per cycle, not confirmed payouts.
            </DaoInfo>
          </div>
          {proposalState ? (
            <div className="p-6">{proposalState}</div>
          ) : (
            <ol className="space-y-3">
              {rows.slice(0, 3).map((proposal, index) => (
                <li
                  key={proposal.hash}
                  className="min-w-0 rounded-xl bg-card shadow-card xl:mr-12 xl:[&:nth-child(2)]:mx-6 xl:[&:nth-child(3)]:ml-12 xl:[&:nth-child(3)]:mr-0"
                >
                  <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                    <ProposalName proposal={proposal} rank={index + 1} />
                    <DaoVotes proposal={proposal} />
                    <p className="whitespace-nowrap text-sm sm:text-right">
                      <strong>{metricNumber(proposal.paymentAmount)}</strong>{" "}
                      Dash
                    </p>
                    <p className="whitespace-nowrap text-right text-sm text-muted-foreground">
                      {proposalDate(proposal.endEpoch)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="order-1 min-w-0 xl:order-2">
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h2
            id={titleId}
            className="dash-heading-page mt-2 sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">DAO</span> Stats
          </h2>
          <p className="dash-body mt-3 text-foreground/50">
            Dash is governed by its community. Explore active proposals,
            treasury funding, and how masternodes vote to shape the
            network&apos;s future.
          </p>
          <Link
            to="/dao"
            className="dash-home-action mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full bg-action-subtle py-2 pl-6 pr-2 text-brand hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore DAO
            <span className="flex size-8 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
              <HomeIcon name="explore" />
            </span>
          </Link>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_331px_240px]">
        <div className="flex min-h-[528px] min-w-0 flex-col gap-6 rounded-3xl bg-foreground/3 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="dash-heading-section">Proposal List</h3>
              <p className="dash-body-compact mt-2 text-foreground/48">
                {proposals.isPending
                  ? "Loading…"
                  : proposals.isError
                    ? "Data unavailable"
                    : `${metricNumber(rows.length, 0)} active proposals`}
              </p>
            </div>
            <DaoInfo label="About proposal statuses">
              Check marks indicate the vote threshold has been reached, not that
              a payout has occurred. Proposals must also fit the treasury
              budget. Dates are shown in UTC.
            </DaoInfo>
          </div>
          {proposalState || (
            <div className="max-h-[400px] min-h-0 overflow-auto">
              <HomeTable className="min-w-[600px]">
                <caption className="sr-only">
                  Active DAO proposals ranked by net yes votes
                </caption>
                <thead className="text-foreground/48">
                  <tr>
                    {["Name", "Votes", "Amount", "End Date"].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="border-b border-foreground/8 px-3 pb-3 pt-2 font-medium last:text-right"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((proposal) => (
                    <tr
                      key={proposal.hash}
                      className="border-b border-foreground/8 last:border-0 hover:bg-brand/4"
                    >
                      <td data-grow className="px-3 py-[18px]">
                        <ProposalName proposal={proposal} />
                      </td>
                      <td className="px-3 py-[18px]">
                        <DaoVotes proposal={proposal} />
                      </td>
                      <td className="px-3 py-[18px] text-right">
                        <strong>{metricNumber(proposal.paymentAmount)}</strong>{" "}
                        Dash
                      </td>
                      <td className="px-3 py-[18px] text-right">
                        {proposalDate(proposal.endEpoch)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </HomeTable>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-h-[232px] flex-1 flex-col gap-8 rounded-3xl bg-foreground/3 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="dash-body">Budget this cycle</h3>
              <DaoInfo label="About the cycle budget">
                The ring shows the share allocated to proposals with enough
                votes and funding capacity. This is a projection, not a
                confirmed payout.
              </DaoInfo>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 xl:gap-4">
              <DaoRing
                large
                value={allocation?.percent ?? null}
                label="Projected budget allocation"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="dash-body-compact text-foreground/50">
                  Cycle Budget
                </p>
                <p className="dash-metric text-brand">
                  {budget.isPending
                    ? "…"
                    : metricNumber(currentBudget?.totalBudget)}{" "}
                  <span className="font-medium">Dash</span>
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
            label="Minimum votes"
            value={
              <>
                {metricNumber(currentBudget?.requiredVotes, 0)}{" "}
                <span className="font-medium">Votes</span>
              </>
            }
          >
            <span className="rounded-lg bg-secondary px-2 py-1">
              Required net yes votes
            </span>
            {!budget.isPending &&
              !budget.isError &&
              currentBudget?.requiredVotes == null && (
                <MissingApiData
                  compact
                  className="mt-2"
                  description="The API does not expose the required vote threshold."
                />
              )}
          </DaoMetric>
          <DaoMetric
            icon="proposals"
            label="Total submitted proposals"
            value={
              <>
                {proposals.isPending
                  ? "…"
                  : metricNumber(
                      proposals.isError ? null : totalSubmitted,
                      0,
                    )}{" "}
                <span className="font-medium">Proposals</span>
              </>
            }
          >
            <p className="mb-2">Returned by the node</p>
            <MissingApiData
              inline
              description="The node returns its current proposal objects, not a lifetime submission count. A 24-hour submission history and change are not exposed."
            />
          </DaoMetric>
          <DaoMetric
            icon="remaining-budget"
            label="Remaining Balance"
            value={
              <>
                {metricNumber(allocation?.remaining)}{" "}
                <span className="font-medium">Dash</span>
              </>
            }
          >
            <p className="text-brand/64">USD {usd(allocation?.remaining)}</p>
            <p className="mt-2">After projected funding</p>
          </DaoMetric>
        </div>
      </div>
    </section>
  );
}
