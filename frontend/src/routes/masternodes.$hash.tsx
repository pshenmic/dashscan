import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignMasternodeDetailPage from "@/themes/neo/pages/masternode-detail";

const ClassicMasternodeDetailPage = lazy(
  () => import("@/themes/dash/pages/masternode-detail"),
);

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
  loader: ({ context, params: { hash } }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchQuery(
          masternodeQueryOptions({ network: defaultNetwork, hash }),
        ),
    ]),
});

function MasternodeDetailRoute() {
  const theme = useActiveTheme();
  const { hash } = Route.useParams();
  if (theme === "neo") return <RedesignMasternodeDetailPage hash={hash} />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicMasternodeDetailPage hash={hash} />
    </Suspense>
  );
}
