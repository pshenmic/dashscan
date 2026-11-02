import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { ApiGovernanceObject } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { DaoHint } from "./dao-hint";
import { HomeTable } from "./home-table";
import { InfoPopover } from "./info-popover";

function DaoVotes({
  proposal,
  threshold,
}: {
  proposal: ApiGovernanceObject;
  threshold?: number | null;
}) {
  return (
    <DaoHint
      label={`Votes for ${proposal.name ?? "proposal"}`}
      description={
        <div className="space-y-1">
          <p>
            Net Yes: {metricNumber(proposal.absoluteYesCount, 0)} · Threshold:{" "}
            {metricNumber(threshold, 0)}
          </p>
          <p>Abstain: {metricNumber(proposal.abstainCount, 0)}</p>
          <p>
            Net Yes = Yes − No. Regular masternodes have weight 1; evonodes have
            weight 4.
          </p>
        </div>
      }
    >
      <span className="flex gap-1 whitespace-nowrap text-[10px] tabular-nums">
        <span className="rounded-full border border-action-subtle bg-action-subtle px-2 py-1">
          <strong>{metricNumber(proposal.yesCount, 0)}</strong> Yes
        </span>
        <span className="rounded-full border border-border bg-foreground/12 px-2 py-1">
          <strong>{metricNumber(proposal.noCount, 0)}</strong> No
        </span>
      </span>
    </DaoHint>
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
        <DaoHint
          label="Proposal voting status"
          description={
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
        </DaoHint>
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

type ProposalProps = {
  rows: ApiGovernanceObject[];
  threshold?: number | null;
  proposalState: ReactNode;
};
export function DaoLeaderboard({
  rows,
  threshold,
  proposalState,
}: ProposalProps) {
  return (
    <div className="relative order-2 min-w-0 xl:order-1 xl:h-[243px]">
      <div className="flex items-center justify-between gap-3 px-3 pb-5 xl:mx-[66px] xl:px-6 xl:pt-6">
        <h3 className="dash-body">Proposals Leaderboard</h3>
        <InfoPopover label="About the proposals leaderboard">
          Active proposals ranked by net yes votes (yes minus no). Amounts are
          requested payments per cycle, not confirmed payouts.
        </InfoPopover>
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
                <DaoVotes proposal={proposal} threshold={threshold} />
                <p className="whitespace-nowrap text-sm sm:text-right">
                  <strong>{metricNumber(proposal.paymentAmount)}</strong> DASH
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
  );
}
export function DaoProposalsTable({
  rows,
  threshold,
  proposalState,
  loading,
  error,
}: ProposalProps & { loading: boolean; error: boolean }) {
  return (
    <div className="flex min-h-[528px] min-w-0 flex-col gap-6 rounded-3xl dash-home-panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="dash-heading-section">Budget Proposals</h3>
          <p className="dash-body-compact mt-2 text-foreground/48">
            {loading
              ? "Loading…"
              : error
                ? "Data unavailable"
                : `${metricNumber(rows.length, 0)} active proposals`}
          </p>
        </div>
        <InfoPopover label="About proposal statuses">
          Check marks indicate the vote threshold has been reached, not that a
          payout has occurred. Proposals must also fit the treasury budget.
          Dates are shown in UTC.
        </InfoPopover>
      </div>
      {proposalState || (
        <div className="max-h-[400px] min-h-0 overflow-auto">
          <HomeTable className="min-w-[600px]">
            <caption className="sr-only">
              Active DAO proposals ranked by net yes votes
            </caption>
            <thead className="text-foreground/48">
              <tr>
                {["Proposal", "Votes", "Payment", "Ends"].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className={`border-b border-foreground/8 px-3 pb-3 pt-2 font-medium ${label === "Proposal" ? "pl-[42px]" : label === "Payment" || label === "Ends" ? "text-right" : ""}`}
                  >
                    {label === "Payment" || label === "Ends" ? (
                      <DaoHint
                        description={
                          label === "Payment"
                            ? "Requested DASH payment per budget cycle, not a confirmed payout."
                            : "Proposal expiry in UTC, not the voting deadline."
                        }
                      >
                        {label}
                      </DaoHint>
                    ) : (
                      label
                    )}
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
                    <DaoVotes proposal={proposal} threshold={threshold} />
                  </td>
                  <td className="px-3 py-[18px] text-right">
                    <strong>{metricNumber(proposal.paymentAmount)}</strong> DASH
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
  );
}
