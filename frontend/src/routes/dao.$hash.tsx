import { createFileRoute } from "@tanstack/react-router";
import { proposalQueryOptions } from "@/lib/api/governance";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import RedesignProposalDetailPage from "@/themes/neo/pages/proposal-detail";

export const Route = createFileRoute("/dao/$hash")({
  component: ProposalDetailRoute,
  head: ({ params }) => ({
    meta: [{ title: `Proposal ${params.hash.slice(0, 12)}… | Dashscan` }],
  }),
  loader: ({ context, params: { hash } }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchQuery(
          proposalQueryOptions({ network: defaultNetwork, hash }),
        ),
    ]),
});

function ProposalDetailRoute() {
  const { hash } = Route.useParams();
  return <RedesignProposalDetailPage hash={hash} />;
}
