import { queryOptions } from "@tanstack/react-query";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type {
  ApiGovernanceBudget,
  ApiGovernanceObject,
  ApiProposalDetail,
  ApiProposalVotesChartPoint,
} from "./types";

type ProposalType = "valid" | "funding" | "delete" | "endorsed" | "all";

interface FetchProposalsInput {
  network: Network;
  proposalType?: ProposalType;
}

async function getProposals(params: FetchProposalsInput) {
  const url = new URL("/governance/proposals", getBaseUrl(params.network));
  if (params.proposalType)
    url.searchParams.set("proposalType", params.proposalType);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiGovernanceObject[]>;
}

export function proposalsQueryOptions(params: FetchProposalsInput) {
  return queryOptions({
    queryKey: ["proposals", params.network, params.proposalType],
    queryFn: () => getProposals(params),
  });
}

interface FetchProposalInput {
  network: Network;
  hash: string;
}

async function getProposal(params: FetchProposalInput) {
  const url = new URL(
    `/governance/proposal/${params.hash}`,
    getBaseUrl(params.network),
  );
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiProposalDetail>;
}

export function proposalQueryOptions(params: FetchProposalInput) {
  return queryOptions({
    queryKey: ["proposal", params.network, params.hash],
    queryFn: () => getProposal(params),
  });
}

interface FetchProposalVotesChartInput {
  network: Network;
  hash: string;
  timestampStart: string;
  timestampEnd: string;
  intervalsCount?: number;
  runningTotal?: boolean;
}

async function getProposalVotesChart(params: FetchProposalVotesChartInput) {
  const url = new URL(
    `/governance/proposal/${params.hash}/votes/chart`,
    getBaseUrl(params.network),
  );
  url.searchParams.set("timestamp_start", params.timestampStart);
  url.searchParams.set("timestamp_end", params.timestampEnd);
  if (params.intervalsCount !== undefined) {
    url.searchParams.set("intervals_count", String(params.intervalsCount));
  }
  if (params.runningTotal !== undefined) {
    url.searchParams.set("running_total", String(params.runningTotal));
  }
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiProposalVotesChartPoint[]>;
}

export function proposalVotesChartQueryOptions(
  params: FetchProposalVotesChartInput,
) {
  return queryOptions({
    queryKey: [
      "proposal-votes-chart",
      params.network,
      params.hash,
      params.timestampStart,
      params.timestampEnd,
      params.intervalsCount,
      params.runningTotal,
    ],
    queryFn: () => getProposalVotesChart(params),
    retry: 1,
  });
}

interface FetchBudgetInput {
  network: Network;
}

async function getBudget(params: FetchBudgetInput) {
  const url = new URL("/governance/budget", getBaseUrl(params.network));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ApiGovernanceBudget>;
}

export function budgetQueryOptions(params: FetchBudgetInput) {
  return queryOptions({
    queryKey: ["governance-budget", params.network],
    queryFn: () => getBudget(params),
  });
}
