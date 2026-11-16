import { Link } from "@tanstack/react-router";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApiBlock } from "@/lib/api/types";
import { metricBytes, metricNumber } from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";

export function BlocksTimeline({
  blocks,
  blockTime,
  newHashes = [],
  loading,
  error,
  onRetry,
}: {
  blocks: ApiBlock[];
  blockTime?: number | null;
  newHashes?: string[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const latest = blocks[0];
  const timeline = blocks.slice(0, 3).reverse();
  const upcoming = latest
    ? ["Next block", "Following block"].map((label, index) => ({
        height: latest.height + index + 1,
        label,
      }))
    : [];
  const averageSeconds =
    blockTime != null && Number.isFinite(blockTime) && blockTime > 0
      ? Math.round(blockTime / 1000)
      : null;
  const averageInterval =
    averageSeconds == null
      ? "—"
      : `${metricNumber(Math.floor(averageSeconds / 60), 0)}m ${String(averageSeconds % 60).padStart(2, "0")}s`;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {error && blocks.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Could not refresh blocks. Showing the last available data.{" "}
          <button type="button" className="underline" onClick={onRetry}>
            Retry
          </button>
        </p>
      )}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[2rem] font-medium leading-[1.1]">Timeline</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="dash-label-small rounded-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                Avg interval · {averageInterval}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              Average interval over the latest 20 indexed blocks. This is
              historical data, not a countdown to the next block.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-2 text-base font-medium leading-[1.1] text-muted-foreground">
          Recently mined blocks and upcoming block heights.
        </p>
      </div>
      {loading ? (
        <p className="dash-body-compact text-muted-foreground">
          Loading blocks…
        </p>
      ) : error && !blocks.length ? (
        <p role="alert" className="dash-body-compact text-destructive">
          Blocks are unavailable.{" "}
          <button type="button" className="underline" onClick={onRetry}>
            Try again
          </button>
        </p>
      ) : !blocks.length ? (
        <p className="dash-body-compact text-muted-foreground">
          No blocks found.
        </p>
      ) : (
        <ol
          aria-label="Recent blocks and upcoming heights"
          className="-mx-4 -my-6 flex gap-6 overflow-x-auto px-4 py-6 sm:-mx-6 sm:px-6"
        >
          {timeline.map((block) => (
            <li key={block.hash} className="min-w-max flex-1 rounded-xl">
              <Link
                to="/blocks/$hashOrHeight"
                params={{ hashOrHeight: block.hash }}
                data-new-block={newHashes.includes(block.hash) || undefined}
                className="dash-timeline-block relative flex h-[74px] min-w-40 flex-col justify-between gap-3 rounded-xl bg-action-solid p-3 tabular-nums text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex items-center justify-between gap-2 whitespace-nowrap text-xs font-medium">
                  <span
                    aria-hidden="true"
                    className="h-[11px] w-[10px] shrink-0 bg-current [mask:url('/icons/home/timeline-block.svg')_center/contain_no-repeat]"
                  />
                  <span data-timeline-height>
                    #{metricNumber(block.height, 0)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 whitespace-nowrap text-xs">
                  <span className="shrink-0 text-sm">
                    <strong>{metricNumber(block.txCount, 0)}</strong> Txs
                  </span>
                  <span className="shrink-0 text-primary-foreground">
                    {metricBytes(block.size)}
                  </span>
                </span>
              </Link>
              <div className="dash-timeline-track relative mt-2 pt-3 text-center text-[10px] text-muted-foreground after:absolute after:left-1/2 after:top-0 after:size-2 after:-translate-x-1/2 after:rounded-full after:bg-brand/70">
                <BlockAge timestamp={block.timestamp} />
              </div>
            </li>
          ))}
          {upcoming.map((block) => (
            <li key={block.height} className="min-w-max flex-1">
              <div className="flex h-[74px] min-w-40 flex-col justify-between gap-3 rounded-xl bg-card p-3 tabular-nums text-accent shadow-[0_2px_10px_rgb(12_28_51/8%)]">
                <span className="flex items-center justify-between gap-2 whitespace-nowrap text-xs font-medium">
                  <span
                    aria-hidden="true"
                    className="h-[11px] w-[10px] shrink-0 bg-current [mask:url('/icons/home/timeline-block.svg')_center/contain_no-repeat]"
                  />
                  #{metricNumber(block.height, 0)}
                </span>
                <span className="whitespace-nowrap text-xs font-extrabold leading-[1.3]">
                  {block.label}
                </span>
              </div>
              <div
                data-upcoming
                className="dash-timeline-track relative mt-2 min-h-[26px] pt-3 text-center text-[10px] text-muted-foreground after:absolute after:left-1/2 after:top-0 after:size-2 after:-translate-x-1/2 after:rounded-full after:bg-brand/70"
              >
                <span className="sr-only">Not yet mined</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
