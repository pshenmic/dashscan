import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BlockNotFoundError, blockQueryOptions } from "@/lib/api/blocks";
import type { PageSize } from "@/lib/pagination";
import { appStore } from "@/lib/store";
import { BlockDetailOverview } from "@/themes/dash/components/block-detail-overview";
import { BlockDetailSkeleton } from "@/themes/dash/components/block-detail-skeleton";
import { BlockTransactionsTable } from "@/themes/dash/components/block-transactions-table";
import { PageStatus } from "@/themes/dash/components/page-status";
import { metricNumber } from "@/themes/dash/lib/home-metrics";

export default function BlockDetailPage({
  hashOrHeight,
  page,
  limit,
}: {
  hashOrHeight: string;
  page: number;
  limit: PageSize;
}) {
  const network = useStore(appStore, (state) => state.network);
  const query = useQuery({
    ...blockQueryOptions({ network, hash: hashOrHeight }),
    refetchInterval: 30_000,
    retry: (count, error) =>
      !(error instanceof BlockNotFoundError) && count < 2,
  });
  const block = query.data;
  if (query.isPending) return <BlockDetailSkeleton />;
  if (!block) {
    if (query.error instanceof BlockNotFoundError)
      return <PageStatus message="Block not found." />;
    return (
      <main className="mx-auto max-w-[1440px] px-4 py-16 text-center">
        <p role="alert">Could not load this block.</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 text-accent underline"
        >
          Retry
        </button>
      </main>
    );
  }
  const navigationClass =
    "inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm tabular-nums transition-colors hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="dash-heading-page break-words">
          Block <span className="text-accent">#</span>
          {metricNumber(block.height, 0)}
        </h1>
        <nav aria-label="Adjacent blocks" className="flex items-center gap-2">
          {block.height > 0 && (
            <Link
              to="/blocks/$hashOrHeight"
              params={{ hashOrHeight: String(block.height - 1) }}
              search={{ page: 1, limit }}
              aria-label="Previous block"
              className={navigationClass}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              {metricNumber(block.height - 1, 0)}
            </Link>
          )}
          {block.confirmations > 1 ? (
            <Link
              to="/blocks/$hashOrHeight"
              params={{ hashOrHeight: String(block.height + 1) }}
              search={{ page: 1, limit }}
              aria-label="Next block"
              className={navigationClass}
            >
              {metricNumber(block.height + 1, 0)}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-label="Next block"
              className={`${navigationClass} opacity-40`}
            >
              {metricNumber(block.height + 1, 0)}
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </nav>
      </div>
      {query.isError && (
        <output className="block text-sm text-muted-foreground">
          Block updates are unavailable. Showing the last loaded data.
        </output>
      )}
      <BlockDetailOverview block={block} network={network} />
      <BlockTransactionsTable
        key={`${network}:${block.hash}`}
        block={block}
        network={network}
        page={page}
        limit={limit}
      />
    </main>
  );
}
