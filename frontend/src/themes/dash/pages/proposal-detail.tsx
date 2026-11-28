import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useClockValue } from "@/components/render-clock";
import {
  budgetQueryOptions,
  proposalQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import { masternodeStatsQueryOptions } from "@/lib/api/masternodes";
import { priceQueryOptions } from "@/lib/api/price";
import { formatDateTime, formatNumber } from "@/lib/format";
import { proposalsAnchor } from "@/lib/governance";
import { appStore } from "@/lib/store";
import { CopyButton } from "@/themes/dash/components/copy-button";
import { DaoHint } from "@/themes/dash/components/dao-hint";
import { IdentifierLink } from "@/themes/dash/components/identifier-link";
import { ProposalMasternodeVotes } from "@/themes/dash/components/proposal-masternode-votes";
import { ProposalVoteHistory } from "@/themes/dash/components/proposal-vote-history";

const metadataBadge =
  "inline-flex h-8 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm";
const metricValue =
  "text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl";
const metricNote =
  "mt-1 w-fit rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground";
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
    <div className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] items-center gap-3 rounded-3xl border border-border bg-card p-4 sm:px-6">
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
  const ranking = useQuery({
    ...proposalsQueryOptions({ network, proposalType: "all" }),
    enabled: active,
  });
  const price = useQuery({
    ...priceQueryOptions({ network, currency: "usd" }),
    enabled: network === "mainnet",
  });
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
  const threshold = budget.data?.requiredVotes;
  const ranked = active
    ? ranking.data?.find((item) => item.hash === hash)
    : null;
  const projected =
    ranked?.enoughVotes != null && ranked.enoughFunds != null
      ? ranked.enoughVotes && ranked.enoughFunds
      : null;
  const yes = proposal.fundingResult?.yesCount ?? proposal.yesCount;
  const no = proposal.fundingResult?.noCount ?? proposal.noCount;
  const elapsed =
    start != null && end != null && end > start
      ? Math.max(0, Math.min(1, (now * 1000 - start) / (end - start)))
      : null;
  const daysLeft =
    active && end != null ? Math.ceil((end - now * 1000) / 86_400_000) : null;
  const timeLeft =
    daysLeft == null
      ? null
      : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section
          aria-label="Funding summary"
          className="grid min-w-0 content-start gap-3"
        >
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_0.8fr] [&>div]:rounded-3xl [&>div]:border [&>div]:border-border [&>div]:bg-card [&>div]:p-4">
            <div className="min-w-0">
              <dt
                title="Amount requested per payment cycle"
                className="text-sm text-muted-foreground"
              >
                Amount
              </dt>
              <dd className={`${metricValue} break-words text-brand`}>
                {number(proposal.paymentAmount)}{" "}
                <span className="text-xl font-medium text-muted-foreground">
                  DASH
                </span>
              </dd>
              {network === "mainnet" &&
                price.data?.usd != null &&
                proposal.paymentAmount != null && (
                  <dd className={metricNote}>
                    ≈{" "}
                    {formatNumber(price.data.usd * proposal.paymentAmount, {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 2,
                    })}
                  </dd>
                )}
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Voters</dt>
              <dd className={`${metricValue} text-brand`}>
                {number(voters)}{" "}
                {voters != null && (
                  <span className="text-xl font-medium text-muted-foreground">
                    {voters === 1 ? "node" : "nodes"}
                  </span>
                )}
              </dd>
              {share && (
                <dd className={metricNote}>
                  <DaoHint
                    label={`${share} of registered masternodes`}
                    description={`${number(registeredVoters)} of ${number(total)} currently registered masternodes voted on funding.`}
                  >
                    {share}
                  </DaoHint>
                </dd>
              )}
            </div>
            <div>
              <dt
                className="text-sm text-muted-foreground"
                title="Projection based on vote and budget ranking, not a confirmed payment"
              >
                Funding
              </dt>
              <dd
                className={`${metricValue} ${projected ? "text-success" : "text-foreground"}`}
              >
                {projected == null ? "—" : projected ? "Yes" : "No"}
              </dd>
              {net != null && (
                <dd className={metricNote}>
                  <DaoHint
                    description={`${number(yes)} Yes − ${number(no)} No = ${number(net)} net yes.${active && threshold != null ? ` Current threshold: ${number(threshold)}.` : ""}`}
                  >
                    {number(net)} net yes
                  </DaoHint>
                </dd>
              )}
            </div>
          </dl>
          {proposal.paymentAddress && (
            <div className="min-w-0 rounded-3xl bg-card p-4 sm:p-6">
              <span className="block text-sm text-muted-foreground">
                Payment Address
              </span>
              <div className="mt-1 flex min-w-0 items-center gap-2 [&_.dash-copy-button]:bg-secondary">
                <Link
                  to="/address/$address"
                  params={{ address: proposal.paymentAddress }}
                  title={proposal.paymentAddress}
                  className="min-w-0 truncate text-xl leading-7 text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:text-2xl"
                >
                  {proposal.paymentAddress}
                </Link>
                <CopyButton
                  value={proposal.paymentAddress}
                  label="Copy payment address"
                />
              </div>
            </div>
          )}
          <section
            aria-label="Proposal timeline"
            className="space-y-3 rounded-3xl bg-card p-4 sm:p-6"
          >
            <div className="flex items-start justify-between gap-2 text-sm">
              <h2 className="font-medium">Proposal Timeline</h2>
              <div className="text-right">
                {elapsed != null && end != null && (
                  <p className="font-semibold text-accent">
                    {timeLeft && deadline ? (
                      <DaoHint
                        description={`Est. voting deadline · ${formatDateTime(deadline)} (current funding cycle). The countdown is to the end of the proposal period.`}
                      >
                        <span className="underline decoration-dotted underline-offset-4">
                          {timeLeft}
                        </span>
                      </DaoHint>
                    ) : (
                      (timeLeft ?? (elapsed === 1 ? "Ended" : "Upcoming"))
                    )}
                  </p>
                )}
              </div>
            </div>
            {elapsed != null && (
              <div className="mx-1">
                {active && (
                  <div
                    className="relative mb-2 w-24 -translate-x-1/2 text-center"
                    style={{
                      left: `clamp(3rem, ${elapsed * 100}%, calc(100% - 3rem))`,
                    }}
                  >
                    <span className="rounded-full bg-action-subtle px-2 py-1 text-xs font-medium text-accent">
                      {date(now * 1000)}
                    </span>
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className="relative border-t-2 border-dashed border-brand/25"
                >
                  <span
                    className="absolute -top-0.5 left-0 h-0.5 bg-brand"
                    style={{ width: `${elapsed * 100}%` }}
                  />
                  <span className="absolute -left-1 -top-1 size-1.5 rounded-full border-2 border-brand bg-card" />
                  <span className="absolute -right-1 -top-1 size-1.5 rounded-full border-2 border-brand/40 bg-card" />
                  {active && (
                    <span
                      className="absolute -top-1 size-1.5 -translate-x-1/2 rounded-full bg-brand ring-4 ring-brand/10"
                      style={{ left: `${elapsed * 100}%` }}
                    />
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>Start: {date(start)}</span>
              <span className="text-right">End: {date(end)}</span>
            </div>
          </section>
        </section>
        <ProposalVoteHistory
          key={hash}
          network={network}
          hash={hash}
          createdAt={proposal.creationTime}
        />
        <dl
          aria-label="Proposal identifiers"
          className="grid min-w-0 gap-3 sm:grid-cols-2 lg:col-span-2 [&_a]:text-accent [&_a:hover]:underline"
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
