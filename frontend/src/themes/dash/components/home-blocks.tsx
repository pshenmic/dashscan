import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/format";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { useNewBlocks } from "@/themes/dash/hooks/use-new-blocks";
import { metricBytes, metricNumber } from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";
import { BlocksTimeline } from "./blocks-timeline";
import { HomeIcon } from "./home-icon";
import { HomeTable } from "./home-table";
import { IdentifierLink } from "./identifier-link";
import { MissingApiData } from "./missing-api-data";

export function HomeBlocks() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const chain = useQuery(homeChainQueryOptions(network));
  const blocksQuery = useQuery(homeBlocksQueryOptions(network));
  const newHashes = useNewBlocks(blocksQuery.data?.resultSet, network);
  const blocks = [...(blocksQuery.data?.resultSet ?? [])].sort(
    (first, second) => second.height - first.height,
  );
  const latest = blocks[0];
  const averageSize = blocks.length
    ? blocks.reduce((total, block) => total + block.size, 0) / blocks.length
    : null;
  const averageDifficulty = blocks.length
    ? blocks.reduce((total, block) => total + block.difficulty, 0) /
      blocks.length
    : null;
  const [chainSize, chainSizeUnit] = metricBytes(chain.data?.sizeOnDisk).split(
    " ",
  );
  const summary = [
    {
      label: "Blockchain Size",
      description:
        "Disk space used by this node’s block and undo files, not the total storage used by the network.",
      icon: "blockchain-size",
      value: chainSize,
      unit: chainSizeUnit,
      detailLabel: "Avg block",
      detail: metricBytes(averageSize),
      detailTitle: `Average block size over the latest ${blocks.length} loaded blocks`,
    },
    {
      label: "Block Height",
      description: "Height of the latest indexed block.",
      icon: "block-height",
      value: metricNumber(latest?.height ?? chain.data?.latestHeight, 0),
      detailLabel: "UTC",
      detailTitle: latest
        ? `Latest indexed block: ${formatDateTime(latest.timestamp)}`
        : "The latest block timestamp is not available.",
      detail: latest
        ? formatDateTime(latest.timestamp, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "—",
    },
    {
      label: "Difficulty",
      description:
        "Current mining difficulty reported by the node. Difficulty is dimensionless.",
      icon: "difficulty",
      value: metricNumber(chain.data?.difficulty, 4),
      detailLabel: `Avg · ${blocks.length || "—"} blocks`,
      detail: metricNumber(averageDifficulty, 4),
      detailTitle: `Average mining difficulty over the latest ${blocks.length} loaded blocks`,
    },
  ];

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-10 py-4 sm:py-8 lg:space-y-16"
    >
      {chain.isError && (
        <p role="alert" className="dash-body-compact text-destructive">
          Could not {chain.data ? "refresh" : "load"} network statistics.{" "}
          {chain.data && "Showing the last available data. "}
          <button
            type="button"
            className="underline"
            onClick={() => void chain.refetch()}
          >
            Try again
          </button>
        </p>
      )}
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:grid-cols-[minmax(0,1fr)_minmax(736px,1.7fr)] xl:gap-16">
        <div>
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h2
            id={titleId}
            className="dash-heading-page mt-2 sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">Blocks</span> Stats
          </h2>
          <p className="dash-body mt-3 text-foreground/50">
            Dash targets an average block interval of about 2.6 minutes —
            explore each block to see more statistics.
          </p>
          <Link
            to="/blocks"
            className="dash-home-action dash-home-action-subtle mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2 text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore Blocks
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
              <HomeIcon name="explore" />
            </span>
          </Link>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="dash-label-small flex flex-wrap items-center gap-3">
            {chain.data?.latestSuperblockHeight != null ? (
              <Link
                to="/blocks/$hashOrHeight"
                params={{
                  hashOrHeight: String(chain.data.latestSuperblockHeight),
                }}
                className="rounded-full bg-positive-brand/12 px-2 py-1 text-success hover:underline"
              >
                Latest Superblock —{" "}
                <strong>
                  #{metricNumber(chain.data.latestSuperblockHeight, 0)}
                </strong>
              </Link>
            ) : (
              <span className="rounded-full bg-secondary px-2 py-1 text-muted-foreground">
                Latest Superblock —
              </span>
            )}
            <span className="text-muted-foreground">
              <span className="inline-flex flex-wrap items-center gap-2 rounded-full bg-card px-2 py-1 shadow-[0_0_24px_rgb(12_28_51/8%)]">
                Block Reward:
                <MissingApiData
                  inline
                  description="The API exposes the current Core-tip subsidy, but not the subsidy, fees and treasury payouts tied to this displayed superblock."
                />
              </span>
            </span>
          </div>
          <BlocksTimeline
            blocks={blocks}
            blockTime={chain.data?.blockTime}
            newHashes={newHashes}
            loading={blocksQuery.isPending}
            error={blocksQuery.isError}
            onRetry={() => void blocksQuery.refetch()}
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[208px_minmax(0,1fr)]">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          {summary.map((item) => (
            <div
              key={item.label}
              className="flex min-w-0 flex-col justify-center gap-4 rounded-3xl dash-home-panel px-6 py-4"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-card">
                <img
                  src={`/icons/home/${item.icon}.svg`}
                  alt=""
                  width={item.icon === "difficulty" ? 17 : 24}
                  height={item.icon === "difficulty" ? 16 : 24}
                  className={
                    item.icon === "difficulty" ? "h-4 w-[17px]" : "size-6"
                  }
                />
              </span>
              <div className="space-y-2">
                <h3 className="text-sm font-medium leading-[1.1] text-foreground/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded-sm text-left focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {item.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64">
                      {item.description}
                    </TooltipContent>
                  </Tooltip>
                </h3>
                <p className="break-words text-2xl font-extrabold leading-[1.2] text-brand">
                  {item.value}
                  {item.unit && (
                    <span className="font-medium"> {item.unit}</span>
                  )}
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex flex-wrap items-center gap-1 rounded-sm text-left text-xs tracking-[-0.009em] focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="rounded-lg bg-secondary px-2 py-1 font-medium text-muted-foreground">
                        {item.detailLabel}
                      </span>
                      <span className="font-extrabold text-brand/64">
                        {item.detail}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    {item.detailTitle}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
        <div className="min-w-0 rounded-3xl dash-home-panel p-4 sm:p-6">
          <h3 className="text-2xl font-medium leading-[1.1]">Block List</h3>
          <p className="mb-6 mt-2 text-sm font-medium leading-[1.1] text-foreground/48">
            Latest indexed blocks · updates every 30 seconds
          </p>
          {blocksQuery.isError && blocks.length > 0 && (
            <p role="alert" className="dash-label-small mb-4 text-destructive">
              Could not refresh blocks. Showing the last available data.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void blocksQuery.refetch()}
              >
                Try again
              </button>
            </p>
          )}
          <div className="overflow-x-auto">
            <HomeTable className="min-w-[700px] font-medium">
              <caption className="sr-only">
                Recently mined blocks, newest first
              </caption>
              <thead className="text-foreground/48">
                <tr>
                  {[
                    "Height",
                    "Block Hash",
                    "Size",
                    "Transactions",
                    "Block age",
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="border-b border-foreground/8 px-3 pb-3 pt-2 font-medium [&:nth-child(n+3)]:text-right"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blocks.slice(0, 6).map((block) => (
                  <tr
                    key={block.hash}
                    data-new-block={newHashes.includes(block.hash) || undefined}
                    className="border-b border-foreground/8 last:border-0"
                  >
                    <td className="px-3 py-[18px]">
                      <Link
                        to="/blocks/$hashOrHeight"
                        params={{ hashOrHeight: block.hash }}
                        className="flex items-center gap-3 whitespace-nowrap text-brand hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <img
                          src="/icons/home/block.svg"
                          alt=""
                          width={24}
                          height={24}
                          className="size-6 shrink-0"
                        />
                        #{metricNumber(block.height, 0)}
                      </Link>
                    </td>
                    <td data-grow className="px-3 py-[18px]">
                      <IdentifierLink kind="block" value={block.hash} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-[18px] text-right tabular-nums">
                      {metricBytes(block.size)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[18px] text-right tabular-nums text-brand">
                      <strong>{metricNumber(block.txCount, 0)}</strong>
                    </td>
                    <td className="whitespace-nowrap px-3 py-[18px] text-right tabular-nums">
                      <BlockAge timestamp={block.timestamp} />
                    </td>
                  </tr>
                ))}
                {!blocks.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-muted-foreground"
                    >
                      {blocksQuery.isPending
                        ? "Loading blocks…"
                        : blocksQuery.isError
                          ? "Block data unavailable"
                          : "No blocks found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </HomeTable>
          </div>
        </div>
      </div>
    </section>
  );
}
