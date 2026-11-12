import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import {
  blockLookupQueryOptions,
  blocksInfiniteQueryOptions,
  blocksQueryOptions,
} from "@/lib/api/blocks";
import { paginationSearchSchema } from "@/lib/pagination";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";

const ClassicBlocksListPage = lazy(
  () => import("@/themes/dash/pages/blocks-list"),
);

const blocksSearchSchema = paginationSearchSchema.extend({
  superblock: z.boolean().optional().catch(undefined),
  view: z.enum(["pagination", "infinite"]).optional().catch(undefined),
  order: z.enum(["asc", "desc"]).default("desc").catch("desc"),
  height: z.coerce
    .string()
    .regex(/^\d+$/)
    .refine((value) => Number.isSafeInteger(Number(value)))
    .optional()
    .catch(undefined),
  hash: z
    .string()
    .regex(/^[a-f\d]{64}$/i)
    .transform((value) => value.toLowerCase())
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/blocks/")({
  validateSearch: blocksSearchSchema,
  loaderDeps: ({ search }) => search,
  component: BlocksListRoute,
  head: () => ({
    meta: [{ title: "Blocks | Dashscan" }],
  }),
  loader: ({
    context,
    deps: { superblock, page, limit, order, view, height, hash },
  }) =>
    prefetchSsrData(context.queryClient, [
      () => {
        const value = hash ?? height;
        if (value !== undefined) {
          return context.queryClient.prefetchQuery(
            blockLookupQueryOptions({ network: defaultNetwork, value }),
          );
        }
        if (view === "infinite")
          return context.queryClient.prefetchInfiniteQuery(
            blocksInfiniteQueryOptions({
              network: defaultNetwork,
              limit: 25,
              order,
              superblock,
            }),
          );
        return context.queryClient.prefetchQuery(
          blocksQueryOptions({
            network: defaultNetwork,
            page,
            limit,
            order,
            superblock,
          }),
        );
      },
    ]),
});

function BlocksListRoute() {
  const { page, limit, superblock, view, order, height, hash } =
    Route.useSearch();
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicBlocksListPage
        page={page}
        limit={limit}
        superblock={superblock}
        view={view}
        order={order}
        height={height}
        hash={hash}
      />
    </Suspense>
  );
}
