import type {
  ApiBlock,
  ApiChainStats,
  ApiGovernanceBudget,
  ApiGovernanceObject,
} from "@/lib/api/types";

export function activeProposals(
  proposals: ApiGovernanceObject[] | undefined,
  now: number,
) {
  return (proposals ?? [])
    .filter(
      (proposal) =>
        proposal.objectType === "Proposal" &&
        proposal.hash &&
        proposal.startEpoch != null &&
        proposal.endEpoch != null &&
        proposal.startEpoch * 1000 <= now &&
        proposal.endEpoch * 1000 > now,
    )
    .sort((first, second) => {
      const firstVotes = first.absoluteYesCount;
      const secondVotes = second.absoluteYesCount;
      if (firstVotes == null) return secondVotes == null ? 0 : 1;
      if (secondVotes == null) return -1;
      return secondVotes - firstVotes;
    });
}

export function budgetAllocation(budget: ApiGovernanceBudget | undefined) {
  const total = budget?.totalBudget;
  const allocated = budget?.enoughVotesAndFundsTotal;
  if (
    total == null ||
    allocated == null ||
    !Number.isFinite(total) ||
    !Number.isFinite(allocated) ||
    total < 0 ||
    allocated < 0 ||
    allocated > total
  )
    return null;
  return {
    allocated,
    remaining: total - allocated,
    percent: total > 0 ? (allocated / total) * 100 : null,
  };
}

export function daoTiming(
  chain: ApiChainStats | undefined,
  latest: ApiBlock | undefined,
  deadline: string | null | undefined,
  now: number,
) {
  const deadlineTime = deadline ? Date.parse(deadline) : Number.NaN;
  const votingDeadline = Number.isFinite(deadlineTime) ? deadlineTime : null;
  const result = {
    votingDeadline,
    votingProgress: null as number | null,
    nextAt: null as number | null,
    blockProgress: null as number | null,
  };
  const previousHeight = chain?.latestSuperblockHeight;
  const nextHeight = chain?.nextSuperblockHeight;
  const blockTime = chain?.blockTime;
  if (
    !latest ||
    previousHeight == null ||
    nextHeight == null ||
    blockTime == null ||
    !Number.isFinite(previousHeight) ||
    !Number.isFinite(nextHeight) ||
    !Number.isFinite(latest.height) ||
    !Number.isFinite(blockTime) ||
    blockTime <= 0 ||
    nextHeight <= previousHeight ||
    latest.height < previousHeight ||
    latest.height >= nextHeight
  )
    return result;
  const timestamp = Date.parse(latest.timestamp);
  if (!Number.isFinite(timestamp)) return result;
  const cycleStart = timestamp - (latest.height - previousHeight) * blockTime;
  return {
    votingDeadline,
    votingProgress:
      votingDeadline != null && votingDeadline > cycleStart
        ? Math.max(
            0,
            Math.min(
              100,
              ((now - cycleStart) / (votingDeadline - cycleStart)) * 100,
            ),
          )
        : null,
    nextAt: timestamp + (nextHeight - latest.height) * blockTime,
    blockProgress:
      ((latest.height - previousHeight) / (nextHeight - previousHeight)) * 100,
  };
}
