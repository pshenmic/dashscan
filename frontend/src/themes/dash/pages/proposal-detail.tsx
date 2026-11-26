import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useClockValue } from "@/components/render-clock";
import { budgetQueryOptions, proposalQueryOptions } from "@/lib/api/governance";
import { masternodeStatsQueryOptions } from "@/lib/api/masternodes";
import { formatDateTime, formatNumber } from "@/lib/format";
import { proposalsAnchor } from "@/lib/governance";
import { appStore } from "@/lib/store";
import { CopyButton } from "@/themes/dash/components/copy-button";
import { DaoHint } from "@/themes/dash/components/dao-hint";
import { IdentifierLink } from "@/themes/dash/components/identifier-link";
import { NetYesBadge } from "@/themes/dash/components/net-yes-badge";
import { ProposalMasternodeVotes } from "@/themes/dash/components/proposal-masternode-votes";
import { ProposalVoteHistory } from "@/themes/dash/components/proposal-vote-history";
import { VoteCountBadge } from "@/themes/dash/components/vote-count-badge";
import { fundingVoteSeries } from "@/themes/dash/lib/funding-vote-series";

const metadataBadge =
  "inline-flex h-8 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm";
const number = (value: number | null | undefined) =>
  value == null ? "—" : formatNumber(value, { maximumFractionDigits: 8 });
const date = (value: number | string | null | undefined) =>
  value == null
    ? "—"
    : formatDateTime(value, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
function Fact({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium tabular-nums">{children}</dd>
    </div>
  );
}

export default function ProposalDetailPage({ hash }: { hash: string }) {
  const network = useStore(appStore, (state) => state.network);
  const query = useQuery(proposalQueryOptions({ network, hash }));
  const budget = useQuery(budgetQueryOptions({ network }));
  const proposal = query.data;
  const now = useClockValue((ms) => Math.floor(ms / 60_000) * 60);
  const active =
    proposal?.startEpoch != null &&
    proposal.endEpoch != null &&
    proposal.startEpoch <= now &&
    now < proposal.endEpoch;
  const stats = useQuery({
    ...masternodeStatsQueryOptions(network),
    enabled: active && proposal?.votes != null,
  });
  if (!proposal)
    return (
      <main className="mx-auto max-w-[1440px] space-y-4 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="dash-heading-page font-extrabold text-brand">
          Proposal
        </h1>
        {query.isPending ? (
          <output>Loading proposal…</output>
        ) : query.isError ? (
          <p role="alert">
            Could not load proposal.{" "}
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="text-accent underline"
            >
              Retry
            </button>
          </p>
        ) : (
          <p>Proposal not found on this network.</p>
        )}
        {!query.isPending && (
          <Link
            to="/dao"
            hash={proposalsAnchor}
            className="text-accent hover:underline"
          >
            Back to proposals
          </Link>
        )}
      </main>
    );
  const net =
    proposal.fundingResult?.absoluteYesCount ?? proposal.absoluteYesCount;
  const name = proposal.name || "Untitled proposal";
  const outcomes = [
    {
      ...fundingVoteSeries.yes,
      count: proposal.fundingResult?.yesCount ?? proposal.yesCount,
    },
    {
      ...fundingVoteSeries.no,
      count: proposal.fundingResult?.noCount ?? proposal.noCount,
    },
    {
      ...fundingVoteSeries.abstain,
      count: proposal.fundingResult?.abstainCount ?? proposal.abstainCount,
    },
  ];
  const voteTotal = outcomes.reduce<number | null>(
    (sum, { count }) => (sum == null || count == null ? null : sum + count),
    0,
  );
  const fundingVotes = proposal.votes?.filter(
    (vote) => vote.signal === "funding",
  );
  const voters =
    fundingVotes && new Set(fundingVotes.map((vote) => vote.outpoint)).size;
  const registeredVoters =
    active && fundingVotes
      ? new Set(
          fundingVotes.flatMap((vote) =>
            vote.proTxHash ? [vote.proTxHash] : [],
          ),
        ).size
      : null;
  const total = stats.data?.total;
  const share =
    registeredVoters != null &&
    total != null &&
    total > 0 &&
    registeredVoters <= total
      ? formatNumber(registeredVoters / total, {
          style: "percent",
          maximumFractionDigits: 1,
        })
      : null;
  const source =
    proposal.url &&
    /^https?:\/\//i.test(proposal.url) &&
    URL.canParse(proposal.url)
      ? new URL(proposal.url)
      : null;
  const isDashCentral =
    source?.origin === "https://www.dashcentral.org" ||
    source?.origin === "https://dashcentral.org";
  const start = proposal.startEpoch == null ? null : proposal.startEpoch * 1000;
  const end = proposal.endEpoch == null ? null : proposal.endEpoch * 1000;
  const deadline =
    end != null && end <= now * 1000 ? null : budget.data?.votingDeadline;
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:space-y-8 lg:px-8">
      <header className="min-w-0">
        <h1 className="dash-heading-page [overflow-wrap:anywhere] sm:dash-heading-hero">
          <span className="font-extrabold text-brand">
            {proposal.objectType === "Trigger" ? "Trigger" : "Proposal"}
          </span>{" "}
          {name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className={metadataBadge}>
            <span className="text-muted-foreground">Submitted</span>
            {date(proposal.creationTime)}
          </p>
          <DaoHint
            description={
              <>
                Proposal payment period.
                <br />
                Start: {start == null ? "Unavailable" : formatDateTime(start)}
                <br />
                End: {end == null ? "Unavailable" : formatDateTime(end)}
              </>
            }
          >
            <span className={metadataBadge}>
              <span className="text-muted-foreground">Period</span>
              {date(start)} – {date(end)}
            </span>
          </DaoHint>
          {proposal.paymentAddress && (
            <div className={`${metadataBadge} max-w-full`}>
              <span className="text-muted-foreground">Payee</span>
              <Link
                to="/address/$address"
                params={{ address: proposal.paymentAddress }}
                title={proposal.paymentAddress}
                className="dash-data-mono min-w-0 truncate text-accent hover:underline"
              >
                {proposal.paymentAddress}
              </Link>
              <CopyButton
                value={proposal.paymentAddress}
                label="Copy payment address"
              />
            </div>
          )}
          {source && !isDashCentral && (
            <a
              className="inline-flex items-center gap-1 rounded-md text-sm text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Source
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {(isDashCentral || network === "mainnet") && (
            <a
              className={`${metadataBadge} ml-auto hover:text-accent focus-visible:outline-2 focus-visible:outline-ring`}
              href={
                isDashCentral
                  ? source.href
                  : "https://www.dashcentral.org/budget"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/icons/dashcentral.png" width="16" height="16" alt="" />
              {isDashCentral ? "DashCentral" : "DashCentral budget"}
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </header>
      {proposal.localValidity === false && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          Flagged invalid by this node
          {proposal.isValidReason ? `: ${proposal.isValidReason}` : "."}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <section
          aria-label="Funding summary"
          className="flex min-w-0 flex-col gap-1 rounded-3xl border border-border bg-card px-5 pb-2 pt-3 shadow-[var(--card-shadow)] lg:rounded-tr-[3rem]"
        >
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
            <div className="min-w-0">
              <dt
                title="Amount requested per payment cycle"
                className="text-sm text-muted-foreground"
              >
                Requested
              </dt>
              <dd className="break-words text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                {number(proposal.paymentAmount)}{" "}
                <span className="text-xl font-medium text-muted-foreground">
                  DASH
                </span>
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-sm text-muted-foreground">Voters</dt>
              <dd className="flex items-center justify-end gap-1.5 tabular-nums">
                <span className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {number(voters)}
                </span>
                {share && (
                  <DaoHint
                    label={`${share} of registered masternodes`}
                    description={`${number(registeredVoters)} of ${number(total)} currently registered masternodes voted on funding.`}
                  >
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-sm font-medium">
                      {share}
                    </span>
                  </DaoHint>
                )}
              </dd>
            </div>
          </dl>
          <section
            aria-label="Funding votes"
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-1 min-[360px]:gap-x-4"
          >
            {deadline && (
              <div className="col-span-full flex text-xs leading-4">
                <DaoHint
                  description={
                    <>
                      Estimated voting cutoff for the current funding cycle, not
                      the proposal expiry date.
                      <br />
                      {formatDateTime(deadline)}
                    </>
                  }
                >
                  <span className="text-muted-foreground">
                    Deadline · {date(deadline)}
                  </span>
                </DaoHint>
              </div>
            )}
            {voteTotal != null && voteTotal > 0 && (
              <div
                aria-hidden="true"
                className="col-span-2 row-start-2 flex h-2 overflow-hidden rounded-full"
              >
                {outcomes.map(
                  ({ label, count, color }) =>
                    count != null &&
                    count > 0 && (
                      <span
                        key={label}
                        style={{
                          backgroundColor: color,
                          width: `${(100 * count) / voteTotal}%`,
                        }}
                      />
                    ),
                )}
              </div>
            )}
            <span className="col-start-3 row-start-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <DaoHint
                description={
                  budget.data?.requiredVotes == null
                    ? "Yes votes minus No votes."
                    : `Yes votes minus No votes. Estimated threshold: ${number(budget.data.requiredVotes)} net yes.`
                }
              >
                Net yes
              </DaoHint>
              <NetYesBadge
                value={net}
                enoughVotes={proposal.enoughVotes}
                threshold={budget.data?.requiredVotes}
              />
            </span>
            <dl className="col-span-full mt-1 grid grid-cols-subgrid items-baseline text-sm">
              {outcomes.map(({ label, count }) => (
                <div
                  key={label}
                  className="inline-flex items-baseline justify-self-start gap-1 min-[360px]:gap-1.5"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="[&>span]:min-w-[calc(3ch+1rem)] [&>span]:justify-center [&>span]:border-0">
                    <VoteCountBadge outcome={label} value={count} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </section>
        <ProposalVoteHistory key={hash} network={network} hash={hash} />
        <dl
          aria-label="Proposal identifiers"
          className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 rounded-3xl border border-border bg-card px-5 py-2 sm:px-7 lg:col-span-2 xl:grid-cols-[max-content_minmax(0,1fr)_max-content_minmax(0,1fr)] [&>div]:col-span-2 [&>div]:grid [&>div]:grid-cols-subgrid [&>div]:items-center [&>div]:space-y-0 [&>div]:py-1 xl:[&>div:nth-child(2)]:border-l xl:[&>div:nth-child(2)]:border-border xl:[&>div:nth-child(2)>dt]:pl-3 [&_a]:text-accent [&_a:hover]:underline"
        >
          <Fact label="Collateral TxID">
            {proposal.collateralHash ? (
              <IdentifierLink
                kind="transaction"
                value={proposal.collateralHash}
              />
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="Proposal hash">
            <div className="flex min-w-0 items-center gap-2">
              <span
                title={proposal.hash ?? hash}
                className="dash-data-mono min-w-0 flex-1 truncate"
              >
                {proposal.hash ?? hash}
              </span>
              <CopyButton
                value={proposal.hash ?? hash}
                label="Copy proposal hash"
              />
            </div>
          </Fact>
          {source && !isDashCentral && (
            <Fact label="Source">
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 text-accent hover:underline"
              >
                <span className="truncate">{source.hostname}</span>
                <ExternalLink
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Fact>
          )}
        </dl>
        <div className="min-w-0 lg:col-span-2">
          <ProposalMasternodeVotes key={hash} votes={proposal.votes} />
        </div>
      </div>
    </main>
  );
}
