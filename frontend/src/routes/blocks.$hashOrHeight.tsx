import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { blockQueryOptions } from "@/lib/api/blocks";
import { paginationSearchSchema } from "@/lib/pagination";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { BlockDetailSkeleton } from "@/themes/dash/components/block-detail-skeleton";

const ClassicBlockDetailPage = lazy(
  () => import("@/themes/dash/pages/block-detail"),
);

export const Route = createFileRoute("/blocks/$hashOrHeight")({
  validateSearch: paginationSearchSchema,
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
  const { hashOrHeight } = Route.useParams();
  const { page, limit } = Route.useSearch();
  return (
    <Suspense fallback={<BlockDetailSkeleton />}>
      <ClassicBlockDetailPage
        key={hashOrHeight}
        hashOrHeight={hashOrHeight}
        page={page}
        limit={limit}
      />
    </Suspense>
  );
}
