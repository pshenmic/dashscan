import type { ApiGovernanceObject } from "@/lib/api/types";

const SUPERBLOCK_INTERVAL = 16616;
const BLOCKS_PER_DAY = 553.87;
const MONTHLY_BUDGET_DASH = 7353.2;

export function getRequiredVotes(masternodeCount: number): number {
  return Math.floor(masternodeCount / 10) + 1;
}

export function getNextSuperblockHeight(currentHeight: number): number {
  return Math.ceil(currentHeight / SUPERBLOCK_INTERVAL) * SUPERBLOCK_INTERVAL;
}

export function getDaysUntilSuperblock(currentHeight: number): number {
  const next = getNextSuperblockHeight(currentHeight);
  return Math.round((next - currentHeight) / BLOCKS_PER_DAY);
}

export function getVotingDeadline(currentHeight: number): Date {
  const votingCutoff = getNextSuperblockHeight(currentHeight) - 1662;
  const blocksRemaining = votingCutoff - currentHeight;
  const msRemaining = (blocksRemaining / BLOCKS_PER_DAY) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + msRemaining);
}

export interface BudgetStats {
  availableBudget: number;
  proposalCount: number;
  remainingBudget: number;
  nextPaymentDays: number;
  requiredVotes: number;
  votingDeadline: Date;
  fundedProposalCount: number;
  fundedAmount: number;
  unfundedProposalCount: number;
  unfundedAmount: number;
}

export function computeBudgetStats(
  onlyProposals: ApiGovernanceObject[],
  masternodeCount: number,
  currentHeight: number,
): BudgetStats {
  const required = getRequiredVotes(masternodeCount);

  const withVotes = onlyProposals
    .filter((p) => (p.absoluteYesCount ?? 0) >= required)
    .sort((a, b) => (b.absoluteYesCount ?? 0) - (a.absoluteYesCount ?? 0));

  let budgetLeft = MONTHLY_BUDGET_DASH;
  let fundedCount = 0;
  let fundedAmount = 0;
  let unfundedFromBudget = 0;

  for (const p of withVotes) {
    const amount = p.data?.paymentAmount ?? 0;
    if (amount <= budgetLeft) {
      budgetLeft -= amount;
      fundedCount++;
      fundedAmount += amount;
    } else {
      unfundedFromBudget += amount;
    }
  }

  const withoutVotes = onlyProposals.filter(
    (p) => (p.absoluteYesCount ?? 0) < required,
  );
  const unfundedFromVotes = withoutVotes.reduce(
    (sum, p) => sum + (p.data?.paymentAmount ?? 0),
    0,
  );

  return {
    availableBudget: MONTHLY_BUDGET_DASH,
    proposalCount: onlyProposals.length,
    remainingBudget: budgetLeft,
    nextPaymentDays: getDaysUntilSuperblock(currentHeight),
    requiredVotes: required,
    votingDeadline: getVotingDeadline(currentHeight),
    fundedProposalCount: fundedCount,
    fundedAmount,
    unfundedProposalCount: withVotes.length - fundedCount + withoutVotes.length,
    unfundedAmount: unfundedFromBudget + unfundedFromVotes,
  };
}
