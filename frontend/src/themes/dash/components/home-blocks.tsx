import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId } from "react";
import { RelativeTime } from "@/components/relative-time";
import { useNow } from "@/components/render-clock";
import { formatDateTime } from "@/lib/format";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { useNewBlocks } from "@/themes/dash/hooks/use-new-blocks";
import {
  metricBytes,
  metricNumber,
  upcomingBlocks,
} from "@/themes/dash/lib/home-metrics";
import { HomeIcon } from "./home-icon";
import { HomeTable } from "./home-table";
import { IdentifierLink } from "./identifier-link";

function ExpectedBlockTime({ expectedAt }: { expectedAt: number }) {
  const now = useNow();
  return (
    <>
      {expectedAt > now
        ? `~${metricNumber(Math.ceil((expectedAt - now) / 60_000), 0)} min`
        : "Awaiting block"}
    </>
  );
}

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
  const upcoming = upcomingBlocks(latest, chain.data?.blockTime);
  const averageSize = blocks.length
    ? blocks.reduce((total, block) => total + block.size, 0) / blocks.length
    : null;
  const summary = [
    {
      label: "Blockchain Size",
      icon: "blockchain-size",
      value: metricBytes(chain.data?.sizeOnDisk),
      detail: `Avg block: ${metricBytes(averageSize)}`,
    },
    {
      label: "Block Height",
      icon: "block-height",
      value: metricNumber(chain.data?.latestHeight ?? latest?.height, 0),
      detail: latest
        ? formatDateTime(latest.timestamp, {
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })
        : "—",
    },
    {
      label: "Difficulty",
      icon: "difficulty",
      value: metricNumber(chain.data?.difficulty),
      detail: "Current mining difficulty",
    },
  ];

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-10 rounded-3xl bg-card p-4 sm:p-8 lg:space-y-16 lg:rounded-[48px]"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-32">
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
            Dash blocks are mined roughly every 2.5 minutes — explore each one
            to see more statistics.
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
        <div className="min-w-0 space-y-6">
          <div className="dash-label-small flex flex-wrap items-center gap-3">
            {chain.data?.latestSuperblockHeight != null ? (
              <Link
                to="/blocks/$hashOrHeight"
                params={{
                  hashOrHeight: String(chain.data.latestSuperblockHeight),
                }}
                className="rounded-full bg-success/12 px-2 py-1 text-success hover:underline"
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
              Updates every 30 seconds
            </span>
          </div>
          <div>
            <h3 className="dash-heading-page">Timeline</h3>
            <p className="dash-body mt-2 text-muted-foreground">
              Recently mined blocks and estimated upcoming mining slots.
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
              aria-label="Recent and estimated blocks"
              className="flex gap-3 overflow-x-auto pb-2"
            >
              {timeline.map((block) => (
                <li
                  key={block.hash}
                  data-new-block={newHashes.includes(block.hash) || undefined}
                  className="min-w-28 flex-1 rounded-xl"
                >
                  <Link
                    to="/blocks/$hashOrHeight"
                    params={{ hashOrHeight: block.hash }}
                    className="flex flex-col gap-3 rounded-xl bg-action-primary p-3 text-primary-foreground hover:bg-action-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="dash-label-small whitespace-nowrap">
                      #{metricNumber(block.height, 0)}
                    </span>
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        <strong>{metricNumber(block.txCount, 0)}</strong> Txs
                      </span>
                      <span>{metricBytes(block.size)}</span>
                    </span>
                  </Link>
                  <div className="mt-3 border-t-2 border-brand pt-2 text-center text-[10px] text-muted-foreground">
                    <RelativeTime timestamp={block.timestamp} />
                  </div>
                </li>
              ))}
              {upcoming.map((block) => (
                <li key={block.height} className="min-w-28 flex-1">
                  <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3 text-brand">
                    <span className="dash-label-small whitespace-nowrap">
                      #{metricNumber(block.height, 0)}
                    </span>
                    <span className="dash-label-small font-extrabold">
                      <ExpectedBlockTime expectedAt={block.expectedAt} />
                    </span>
                  </div>
                  <div className="mt-3 border-t-2 border-dashed border-border pt-2 text-center text-[10px] text-muted-foreground">
                    Estimated
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {summary.map((item) => (
            <div
              key={item.label}
              className="flex min-w-0 flex-col justify-center gap-4 rounded-3xl bg-secondary px-6 py-4"
            >
              <img
                src={`/icons/home/${item.icon}.svg`}
                alt=""
                width={24}
                height={24}
                className="size-6"
              />
              <div className="space-y-2">
                <h3 className="dash-body-compact text-muted-foreground">
                  {item.label}
                </h3>
                <p className="dash-metric break-words text-brand">
                  {item.value}
                </p>
                <p className="dash-label-small text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="min-w-0 rounded-3xl bg-secondary p-4 sm:p-6">
          <h3 className="dash-heading-section mb-6">Block List</h3>
          {blocksQuery.isError && blocks.length > 0 && (
            <p role="alert" className="dash-label-small mb-4 text-destructive">
              Could not refresh blocks. Showing the last available data.
            </p>
          )}
          <div className="overflow-x-auto">
            <HomeTable className="min-w-[660px]">
              <caption className="sr-only">
                Recently mined blocks, newest first
              </caption>
              <thead className="text-muted-foreground">
                <tr>
                  {["Age", "Height", "Block Hash", "Size", "Count"].map(
                    (label) => (
                      <th
                        key={label}
                        scope="col"
                        className="border-b border-border px-3 py-4 font-medium last:text-right"
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
                    className="border-b border-border last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-5">
                      <RelativeTime timestamp={block.timestamp} />
                    </td>
                    <td className="px-3 py-5">
                      <Link
                        to="/blocks/$hashOrHeight"
                        params={{ hashOrHeight: block.hash }}
                        className="flex items-center gap-3 whitespace-nowrap text-accent hover:underline"
                      >
                        <img
                          src="/icons/home/block.svg"
                          alt=""
                          width={24}
                          height={24}
                          className="size-6"
                        />
                        #{metricNumber(block.height, 0)}
                      </Link>
                    </td>
                    <td data-grow className="px-3 py-5">
                      <IdentifierLink kind="block" value={block.hash} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-5">
                      {metricBytes(block.size)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-5 text-right text-accent">
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
