import { createFileRoute } from "@tanstack/react-router";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicMasternodeDetailPage from "@/themes/dash/pages/masternode-detail";
import RedesignMasternodeDetailPage from "@/themes/neo/pages/masternode-detail";

export const Route = createFileRoute("/masternodes/$hash")({
  component: MasternodeDetailRoute,
  head: ({ params }) => ({
    meta: [
      { title: `Masternode ${params.hash.slice(0, 12)}... | Dashscan` },
      {
        property: "og:title",
        content: `Masternode ${params.hash.slice(0, 12)}…`,
      },
      { property: "og:image", content: `/og/masternode/${params.hash}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `/og/masternode/${params.hash}` },
    ],
  }),
  loader: async ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    await context.queryClient.prefetchQuery(
      masternodeQueryOptions({ network: defaultNetwork, hash }),
    );
  },
});

function MasternodeDetailRoute() {
  const theme = useActiveTheme();
  const { hash } = Route.useParams();
  if (theme === "neo") return <RedesignMasternodeDetailPage hash={hash} />;
  return <ClassicMasternodeDetailPage hash={hash} />;
}
