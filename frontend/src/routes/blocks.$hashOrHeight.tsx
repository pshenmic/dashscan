import { createFileRoute } from "@tanstack/react-router";
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
});

function BlockDetailRoute() {
  const theme = useActiveTheme();
  const { hashOrHeight } = Route.useParams();
  if (theme === "neo")
    return <RedesignBlockDetailPage hashOrHeight={hashOrHeight} />;
  return <ClassicBlockDetailPage hashOrHeight={hashOrHeight} />;
}
