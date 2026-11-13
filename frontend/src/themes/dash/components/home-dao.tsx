import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import { useClockValue } from "@/components/render-clock";
import {
  budgetQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import { appStore } from "@/lib/store";
import { activeProposals } from "@/themes/dash/lib/dao-metrics";
import { DaoBudgetCards } from "./dao-budget-cards";
import { DaoLeaderboard, DaoProposalsTable } from "./dao-proposals";
import { HomeIcon } from "./home-icon";

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
  const rows = activeProposals(
    proposals.isError ? undefined : proposals.data,
    proposalTime,
  );
  const currentBudget = budget.isError ? undefined : budget.data;
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
      className="flex flex-col gap-10 lg:gap-16"
    >
      <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,745fr)_minmax(0,503fr)] xl:gap-16">
        <DaoLeaderboard
          rows={rows}
          threshold={currentBudget?.requiredVotes}
          proposalState={proposalState}
        />
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
          <p className="dash-body mt-3 text-muted-foreground">
            Dash is governed by its community. Explore active proposals,
            treasury funding, and how masternodes vote to shape the
            network&apos;s future.
          </p>
          <Link
            to="/dao"
            className="dash-home-action dash-home-action-subtle mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2 text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore DAO
            <span className="flex size-8 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
              <HomeIcon name="explore" />
            </span>
          </Link>
        </div>
      </div>
      <div className="grid gap-4 min-[1440px]:grid-cols-[minmax(0,1fr)_331px_240px]">
        <DaoProposalsTable
          rows={rows}
          threshold={currentBudget?.requiredVotes}
          proposalState={proposalState}
          loading={proposals.isPending}
          error={proposals.isError}
        />
        <DaoBudgetCards
          network={network}
          budget={budget}
          proposalCount={proposals.isError ? null : rows.length}
          proposalsPending={proposals.isPending}
        />
      </div>
    </section>
  );
}
