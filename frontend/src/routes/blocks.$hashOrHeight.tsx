import { createFileRoute } from "@tanstack/react-router";
import { blockQueryOptions } from "@/lib/api/blocks";
import { transactionsByHeightQueryOptions } from "@/lib/api/transactions";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicBlockDetailPage from "@/themes/dash/pages/block-detail";
import RedesignBlockDetailPage from "@/themes/neo/pages/block-detail";

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
  loader: async ({ context, params: { hashOrHeight } }) => {
    if (typeof window !== "undefined") return;
    const blockOpts = blockQueryOptions({
      network: defaultNetwork,
      hash: hashOrHeight,
    });
    await context.queryClient.prefetchQuery(blockOpts);
    const block = context.queryClient.getQueryData(blockOpts.queryKey);
    if (block) {
      await context.queryClient.prefetchQuery(
        transactionsByHeightQueryOptions({
          network: defaultNetwork,
          height: block.height,
          page: 1,
          limit: 10,
          order: "desc",
        }),
      );
    }
  },
});

function BlockDetailRoute() {
  const theme = useActiveTheme();
  const { hashOrHeight } = Route.useParams();
  if (theme === "neo")
    return <RedesignBlockDetailPage hashOrHeight={hashOrHeight} />;
  return <ClassicBlockDetailPage hashOrHeight={hashOrHeight} />;
}
