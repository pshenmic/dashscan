import { createFileRoute } from "@tanstack/react-router";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import { defaultNetwork } from "@/lib/store";
import ClassicMasternodeDetailPage from "@/themes/classic/pages/masternode-detail";

export const Route = createFileRoute("/masternodes/$hash")({
  component: MasternodeDetailRoute,
  head: ({ params }) => ({
    meta: [{ title: `Masternode ${params.hash.slice(0, 12)}... | DashScan` }],
  }),
  loader: async ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    await context.queryClient.prefetchQuery(
      masternodeQueryOptions({ network: defaultNetwork, hash }),
    );
  },
});

function MasternodeDetailRoute() {
  const { hash } = Route.useParams();
  return <ClassicMasternodeDetailPage hash={hash} />;
}
