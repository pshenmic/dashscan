import { describe, expect, it } from "vitest";
import type { ApiBlock, ApiChainStats, ApiGovernanceBudget, ApiGovernanceObject } from "@/lib/api/types";
import { activeProposals, budgetAllocation, daoTiming } from "@/themes/dash/lib/dao-metrics";

const proposal = (overrides: Partial<ApiGovernanceObject>) => ({
  objectType: "Proposal", hash: "proposal", startEpoch: 10, endEpoch: 100,
  absoluteYesCount: 0, ...overrides,
}) as ApiGovernanceObject;

describe("Home DAO metrics", () => {
  it("filters active proposals and ranks net votes without mutating the response", () => {
    const entries = [proposal({ hash: "lower", absoluteYesCount: -5 }), proposal({ hash: "higher", absoluteYesCount: 2 }),
      proposal({ hash: "unknown", absoluteYesCount: null }), proposal({ hash: "expired", endEpoch: 50 }),
      proposal({ hash: "future", startEpoch: 51 }), proposal({ objectType: "Trigger" }), proposal({ hash: null }), proposal({ endEpoch: null })];
    expect(activeProposals(entries, 50_000).map(entry => entry.hash)).toEqual(["higher", "lower", "unknown"]);
    expect(entries[0].hash).toBe("lower");
    expect(activeProposals(undefined, 50_000)).toEqual([]);
  });

  it("uses the combined vote-and-funding allocation, not all requests", () => {
    const budget = { totalBudget: 100, totalRequested: 200, enoughFundsTotal: 90, enoughVotesAndFundsTotal: 40 } as ApiGovernanceBudget;
    expect(budgetAllocation(budget)).toEqual({ allocated: 40, remaining: 60, percent: 40 });
    expect(budgetAllocation({ ...budget, enoughVotesAndFundsTotal: 0 })).toEqual({ allocated: 0, remaining: 100, percent: 0 });
    expect(budgetAllocation({ ...budget, totalBudget: 0, enoughVotesAndFundsTotal: 0 })).toEqual({ allocated: 0, remaining: 0, percent: null });
  });

  it("does not guess allocations on older backends or inconsistent data", () => {
    expect(budgetAllocation(undefined)).toBeNull();
    for (const allocated of [undefined, null, -1, 101, Number.NaN]) {
      expect(budgetAllocation({ totalBudget: 100, enoughVotesAndFundsTotal: allocated } as ApiGovernanceBudget)).toBeNull();
    }
  });

  const chain = { latestSuperblockHeight: 100, nextSuperblockHeight: 124, blockTime: 60_000 } as ApiChainStats;
  const latest = { height: 112, timestamp: "2026-10-30T12:12:00Z" } as ApiBlock;
  const deadline = "2026-10-30T12:22:00Z";

  it("anchors estimates to block timestamps and uses supplied superblock heights", () => {
    const result = daoTiming(chain, latest, deadline, Date.parse("2026-10-30T12:11:00Z"));
    expect(result.nextAt).toBe(Date.parse("2026-10-30T12:24:00Z"));
    expect(result.blockProgress).toBe(50);
    expect(result.votingProgress).toBe(50);
    expect(daoTiming(chain, latest, deadline, Date.parse("2026-10-30T12:30:00Z")).votingProgress).toBe(100);
    expect(daoTiming(chain, latest, deadline, Date.parse("2026-10-29T12:00:00Z")).votingProgress).toBe(0);
  });

  it("withholds estimates for missing data or inconsistent cycle snapshots", () => {
    expect(daoTiming(undefined, undefined, deadline, 0).votingDeadline).toBe(Date.parse(deadline));
    for (const block of [undefined, { ...latest, height: 99 }, { ...latest, height: 124 }, { ...latest, timestamp: "invalid" }]) {
      const result = daoTiming(chain, block, null, 0);
      expect(result.nextAt).toBeNull();
      expect(result.blockProgress).toBeNull();
    }
    expect(daoTiming({ ...chain, blockTime: 0 }, latest, deadline, 0).nextAt).toBeNull();
    expect(daoTiming(chain, latest, "invalid", 0).votingDeadline).toBeNull();
  });
});
