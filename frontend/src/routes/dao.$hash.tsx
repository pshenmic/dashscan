import { createFileRoute } from "@tanstack/react-router";
import { blocksQueryOptions } from "@/lib/api/blocks";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import { proposalQueryOptions } from "@/lib/api/governance";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import { defaultNetwork } from "@/lib/store";
import RedesignProposalDetailPage from "@/themes/neo/pages/proposal-detail";

export const Route = createFileRoute("/dao/$hash")({
  component: ProposalDetailRoute,
  head: ({ params }) => ({
    meta: [{ title: `Proposal ${params.hash.slice(0, 12)}… | Dashscan` }],
  }),
  loader: ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        proposalQueryOptions({ network, hash }),
      ),
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page: 1, limit: 1 }),
      ),
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
    ]);
  },
});

function ProposalDetailRoute() {
  const { hash } = Route.useParams();
  return <RedesignProposalDetailPage hash={hash} />;
}
