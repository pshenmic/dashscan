import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import { RelativeTime } from "@/components/relative-time";
import { formatDateTime } from "@/lib/format";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { useNewBlocks } from "@/themes/dash/hooks/use-new-blocks";
import { metricBytes, metricNumber } from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";
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
  const timeline = blocks.slice(0, 3).reverse();
  const upcoming = latest
    ? ["Next block", "Following block"].map((label, index) => ({
        height: latest.height + index + 1,
        label,
      }))
    : [];
  const blockTime = chain.data?.blockTime;
  const averageSeconds =
    blockTime != null && Number.isFinite(blockTime) && blockTime > 0
      ? Math.round(blockTime / 1000)
      : null;
  const averageInterval =
    averageSeconds == null
      ? "—"
      : `${metricNumber(Math.floor(averageSeconds / 60), 0)}m ${String(averageSeconds % 60).padStart(2, "0")}s`;
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
      icon: "blockchain-size",
      value: chainSize,
      unit: chainSizeUnit,
      detailLabel: "AVG",
      detail: metricBytes(averageSize),
      detailTitle: `Average block size over the latest ${blocks.length} loaded blocks`,
    },
    {
      label: "Block Height",
      icon: "block-height",
      value: metricNumber(latest?.height ?? chain.data?.latestHeight, 0),
      detailLabel: "Time",
      detailTitle: "Timestamp of the latest loaded block (UTC)",
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
      icon: "difficulty",
      value: metricNumber(chain.data?.difficulty, 4),
      detailLabel: "AVG",
      detail: metricNumber(averageDifficulty, 4),
      detailTitle: `Average mining difficulty over the latest ${blocks.length} loaded blocks`,
    },
  ];

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-10 rounded-3xl bg-card p-4 sm:p-8 lg:space-y-16 lg:rounded-[48px]"
    >
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
            className="dash-home-action mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full bg-action-subtle py-2 pl-6 pr-2 text-brand hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
                  description="Block reward data is not provided by the current API."
                />
              </span>
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[2rem] font-medium leading-[1.1]">
                Timeline
              </h3>
              <span
                className="dash-label-small text-muted-foreground"
                title="Average interval over the last 20 indexed blocks, not a countdown."
              >
                Avg interval · {averageInterval}
              </span>
            </div>
            <p className="mt-2 text-base font-medium leading-[1.1] text-foreground/48">
              Recently mined blocks and upcoming block heights.
            </p>
          </div>
          {blocksQuery.isPending ? (
            <p className="dash-body-compact text-muted-foreground">
              Loading blocks…
            </p>
          ) : blocksQuery.isError && !blocks.length ? (
            <p role="alert" className="dash-body-compact text-destructive">
              Blocks are unavailable.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void blocksQuery.refetch()}
              >
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
                <li
                  key={block.hash}
                  className="min-w-[128px] flex-1 rounded-xl"
                >
                  <Link
                    to="/blocks/$hashOrHeight"
                    params={{ hashOrHeight: block.hash }}
                    data-new-block={newHashes.includes(block.hash) || undefined}
                    className="dash-timeline-block relative flex h-[74px] flex-col justify-between gap-3 rounded-xl bg-brand p-3 text-primary-foreground hover:bg-action-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex items-center justify-between gap-2 whitespace-nowrap text-xs font-medium">
                      <span
                        aria-hidden="true"
                        className="h-[11px] w-[10px] shrink-0 bg-current [mask:url('/icons/home/timeline-block.svg')_center/contain_no-repeat]"
                      />
                      #{metricNumber(block.height, 0)}
                    </span>
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-sm">
                        <strong>{metricNumber(block.txCount, 0)}</strong> Txs
                      </span>
                      <span className="text-primary-foreground/48">
                        {metricBytes(block.size)}
                      </span>
                    </span>
                  </Link>
                  <div className="relative mt-2 pt-3 text-center text-[10px] text-foreground/48 before:absolute before:-right-6 before:left-0 before:top-[3px] before:border-t-2 before:border-brand after:absolute after:left-1/2 after:top-0 after:size-2 after:-translate-x-1/2 after:rounded-full after:bg-brand after:shadow-[0_0_12px_var(--brand)]">
                    <RelativeTime timestamp={block.timestamp} />
                  </div>
                </li>
              ))}
              {upcoming.map((block) => (
                <li key={block.height} className="group min-w-[128px] flex-1">
                  <div className="flex h-[74px] flex-col justify-between gap-3 rounded-xl bg-card p-3 text-brand shadow-[0_0_24px_rgb(12_28_51/8%)]">
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
                  <div className="relative mt-2 min-h-[26px] pt-3 text-center text-[10px] text-foreground/48 before:absolute before:-right-6 before:left-0 before:top-[3px] before:border-t-2 before:border-dashed before:border-brand/24 after:absolute after:left-1/2 after:top-0 after:size-2 after:-translate-x-1/2 after:rounded-full after:bg-brand after:shadow-[0_0_12px_var(--brand)] group-last:before:right-0">
                    <span className="sr-only">Not yet mined</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[208px_minmax(0,1fr)]">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          {summary.map((item) => (
            <div
              key={item.label}
              className="flex min-w-0 flex-col justify-center gap-4 rounded-3xl bg-foreground/3 px-6 py-4"
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
                  {item.label}
                </h3>
                <p className="break-words text-2xl font-extrabold leading-[1.2] text-brand">
                  {item.value}
                  {item.unit && (
                    <span className="font-medium"> {item.unit}</span>
                  )}
                </p>
                <div
                  className="flex flex-wrap items-center gap-1 text-xs tracking-[-0.009em]"
                  title={item.detailTitle}
                >
                  <span className="rounded-lg bg-secondary px-2 py-1 font-medium text-muted-foreground">
                    {item.detailLabel}
                  </span>
                  <span className="font-extrabold text-brand/64">
                    {item.detail}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="min-w-0 rounded-3xl bg-foreground/3 p-4 sm:p-6">
          <h3 className="mb-6 text-2xl font-medium leading-[1.1]">
            Block List
          </h3>
          {blocksQuery.isError && blocks.length > 0 && (
            <p role="alert" className="dash-label-small mb-4 text-destructive">
              Could not refresh blocks. Showing the last available data.
            </p>
          )}
          <div className="overflow-x-auto">
            <HomeTable className="min-w-[700px] font-medium">
              <caption className="sr-only">
                Recently mined blocks, newest first
              </caption>
              <thead className="text-foreground/48">
                <tr>
                  {["Age", "Height", "Block Hash", "Size", "Count"].map(
                    (label) => (
                      <th
                        key={label}
                        scope="col"
                        className="border-b border-foreground/8 px-3 pb-3 pt-2 font-medium last:text-right"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {blocks.slice(0, 6).map((block) => (
                  <tr
                    key={block.hash}
                    data-new-block={newHashes.includes(block.hash) || undefined}
                    className="border-b border-foreground/8 last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-[18px] tabular-nums">
                      <BlockAge timestamp={block.timestamp} />
                    </td>
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
                    <td className="whitespace-nowrap px-3 py-[18px] tabular-nums">
                      {metricBytes(block.size)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[18px] text-right tabular-nums text-brand">
                      <strong>{metricNumber(block.txCount, 0)}</strong> Txs
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
