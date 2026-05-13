import { createFileRoute } from "@tanstack/react-router";
import { blockQueryOptions } from "@/lib/api/blocks";
import { transactionsByHeightQueryOptions } from "@/lib/api/transactions";
import { defaultNetwork } from "@/lib/store";
import ClassicBlockDetailPage from "@/themes/classic/pages/block-detail";

export const Route = createFileRoute("/blocks/$hashOrHeight")({
  component: BlockDetailRoute,
  head: ({ params }) => ({
    meta: [{ title: `Block ${params.hashOrHeight} | DashScan` }],
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
  const { hashOrHeight } = Route.useParams();
  return <ClassicBlockDetailPage hashOrHeight={hashOrHeight} />;
}
