import { createFileRoute } from "@tanstack/react-router";
import RedesignProposalDetailPage from "@/themes/neo/pages/proposal-detail";

export const Route = createFileRoute("/dao/$hash")({
  component: ProposalDetailRoute,
  head: ({ params }) => ({
    meta: [{ title: `Proposal ${params.hash.slice(0, 12)}… | Dashscan` }],
  }),
});

function ProposalDetailRoute() {
  const { hash } = Route.useParams();
  return <RedesignProposalDetailPage hash={hash} />;
}
