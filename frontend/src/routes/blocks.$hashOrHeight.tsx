import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { blockQueryOptions } from "@/lib/api/blocks";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignBlockDetailPage from "@/themes/neo/pages/block-detail";

const ClassicBlockDetailPage = lazy(
  () => import("@/themes/dash/pages/block-detail"),
);

export const Route = createFileRoute("/blocks/$hashOrHeight")({
  component: BlockDetailRoute,
  head: ({ params }) => ({
    meta: [
      { title: `Block ${params.hashOrHeight} | Dashscan` },
      { property: "og:title", content: `Block ${params.hashOrHeight}` },
      {
        property: "og:image",
        content: `/og/block/${params.hashOrHeight}`,
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: `/og/block/${params.hashOrHeight}`,
      },
    ],
  }),
  loader: ({ context, params: { hashOrHeight } }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchQuery(
          blockQueryOptions({ network: defaultNetwork, hash: hashOrHeight }),
        ),
    ]),
});

function BlockDetailRoute() {
  const theme = useActiveTheme();
  const { hashOrHeight } = Route.useParams();
  if (theme === "neo")
    return <RedesignBlockDetailPage hashOrHeight={hashOrHeight} />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicBlockDetailPage hashOrHeight={hashOrHeight} />
    </Suspense>
  );
}
