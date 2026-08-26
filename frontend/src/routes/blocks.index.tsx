import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { paginationSearchSchema } from "@/lib/pagination";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignBlocksListPage from "@/themes/neo/pages/blocks-list";

const ClassicBlocksListPage = lazy(
  () => import("@/themes/dash/pages/blocks-list"),
);

const blocksSearchSchema = paginationSearchSchema.extend({
  superblock: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute("/blocks/")({
  validateSearch: blocksSearchSchema,
  component: BlocksListRoute,
  head: () => ({
    meta: [{ title: "Blocks | Dashscan" }],
  }),
});

function BlocksListRoute() {
  const theme = useActiveTheme();
  const { page, limit } = Route.useSearch();
  if (theme === "neo") return <RedesignBlocksListPage />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicBlocksListPage page={page} limit={limit} />
    </Suspense>
  );
}
