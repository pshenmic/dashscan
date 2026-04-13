import { queryOptions } from "@tanstack/react-query";
import type { Network } from "@/lib/store";
import { getBaseUrl } from "./client";
import type { ApiGovernanceObject } from "./types";

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
