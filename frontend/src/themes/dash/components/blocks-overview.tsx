import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Coins, Database, Gauge, ReceiptText } from "lucide-react";
import { useId } from "react";
import { blockRewardQueryOptions } from "@/lib/api/blocks";
import { homeBlocksQueryOptions, homeChainQueryOptions } from "@/lib/home";
import type { Network } from "@/lib/store";
import { useNewBlocks } from "@/themes/dash/hooks/use-new-blocks";
import {
  metricBytes,
  metricDuffs,
  metricNumber,
} from "@/themes/dash/lib/home-metrics";
import { BlocksTimeline } from "./blocks-timeline";
import { InfoPopover } from "./info-popover";
import { MetricCard } from "./metric-card";
import { SkeletonBar } from "./skeleton";
import { TransactionHistoryPanel } from "./transaction-history-panel";

function MetricValue({ value, unit }: { value: string; unit?: string }) {
  return (
    <span>
      {value}
      {unit && value !== "—" && (
        <span className="font-medium text-muted-foreground"> {unit}</span>
      )}
    </span>
  );
}

function Height({ value }: { value: number | null | undefined }) {
  return value == null ? (
    "—"
  ) : (
    <Link
      to="/blocks/$hashOrHeight"
      params={{ hashOrHeight: String(value) }}
      className="hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      {metricNumber(value, 0)}
    </Link>
  );
}

export function BlocksOverview({ network }: { network: Network }) {
  const titleId = useId();
  const chain = useQuery(homeChainQueryOptions(network));
  const blocksQuery = useQuery(homeBlocksQueryOptions(network));
  const newHashes = useNewBlocks(blocksQuery.data?.resultSet, network);
  const blocks = [...(blocksQuery.data?.resultSet ?? [])].sort(
    (first, second) => second.height - first.height,
  );
  const latest = blocks[0]?.height ?? chain.data?.latestHeight;
  const averageSize = blocks.length
    ? blocks.reduce((total, block) => total + block.size, 0) / blocks.length
    : null;
  const averageDifficulty = blocks.length
    ? blocks.reduce((total, block) => total + block.difficulty, 0) /
      blocks.length
    : null;
  const feeTotal = blocks.reduce(
    (total, block) => total + (block.fees ?? 0),
    0,
  );
  const averageFees =
    blocks.length > 0 &&
    blocks.every(
      (block) =>
        block.fees != null &&
        Number.isSafeInteger(block.fees) &&
        block.fees >= 0,
    ) &&
    Number.isSafeInteger(feeTotal)
      ? Math.round(feeTotal / blocks.length)
      : null;
  const [chainSize, chainSizeUnit] = metricBytes(chain.data?.sizeOnDisk).split(
    " ",
  );
  const sampleDescription = `Average over the latest ${blocks.length} loaded blocks.`;
  const reward = useQuery(
    blockRewardQueryOptions({
      network,
      height: latest,
    }),
  );
  return (
    <section
      aria-labelledby={titleId}
      className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-positive-brand/12 px-3 py-1 text-success">
              Latest Superblock ·{" "}
              <Height value={chain.data?.latestSuperblockHeight} />
            </span>
          </div>
          <h1 id={titleId} className="dash-heading-page sm:dash-heading-hero">
            <span className="font-extrabold text-brand">Blocks</span> Stats
          </h1>
        </div>
        <div className="grid min-w-0 auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard
            label="Blockchain Size"
            icon={Database}
            description="Disk space used by this node’s block and undo files, not the total storage used by the network."
            detail={
              <InfoPopover
                label="About average block size"
                trigger={
                  <>
                    <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                      Avg block
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      {metricBytes(averageSize)}
                    </span>
                  </>
                }
              >
                {sampleDescription}
              </InfoPopover>
            }
          >
            <MetricValue value={chainSize} unit={chainSizeUnit} />
          </MetricCard>
          <MetricCard
            label="Difficulty"
            icon={Gauge}
            description="Current mining difficulty reported by Dash Core. Difficulty has no unit."
            detail={
              <InfoPopover
                label="About average difficulty"
                trigger={
                  <>
                    <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                      Avg · {blocks.length || "—"} blocks
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      {metricNumber(averageDifficulty, 4)}
                    </span>
                  </>
                }
              >
                {sampleDescription}
              </InfoPopover>
            }
          >
            {metricNumber(chain.data?.difficulty, 4)}
          </MetricCard>
          {(
            [
              ["Block Subsidy", "subsidy", Coins],
              ["Block Fees", "fees", ReceiptText],
            ] as const
          ).map(([label, field, icon]) => (
            <MetricCard
              key={field}
              label={label}
              icon={icon}
              description={
                field === "subsidy"
                  ? `Subsidy for block #${metricNumber(latest, 0)}, excluding transaction fees and treasury payouts.`
                  : `Transaction fees for block #${metricNumber(latest, 0)}, excluding subsidy.`
              }
              detail={
                field === "subsidy" ? (
                  <>
                    <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                      Block
                    </span>
                    <Height value={latest} />
                  </>
                ) : (
                  <InfoPopover
                    label="About average block fees"
                    trigger={
                      <>
                        <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                          Avg/block
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          <MetricValue
                            value={metricDuffs(averageFees)}
                            unit="DASH"
                          />
                        </span>
                      </>
                    }
                  >
                    {averageFees == null
                      ? "A complete fee sample is not available."
                      : `${sampleDescription} Rounded to the nearest duff.`}
                  </InfoPopover>
                )
              }
            >
              {chain.isPending || reward.isLoading ? (
                <SkeletonBar className="h-7 w-28" />
              ) : reward.isError ? (
                <button
                  type="button"
                  className="text-sm text-destructive underline"
                  onClick={() => void reward.refetch()}
                >
                  Retry block reward
                </button>
              ) : reward.data != null &&
                reward.data.height === latest &&
                reward.data[field] != null ? (
                <span
                  title={`${metricDuffs(reward.data[field])} DASH · Block #${latest}`}
                >
                  <MetricValue
                    value={metricDuffs(
                      reward.data[field],
                      field === "subsidy" ? 2 : 8,
                    )}
                    unit="DASH"
                  />
                </span>
              ) : (
                <span className="text-muted-foreground" title="Not available">
                  —
                </span>
              )}
            </MetricCard>
          ))}
          {chain.isError && (
            <button
              type="button"
              className="text-left text-sm text-destructive underline col-span-full"
              onClick={() => void chain.refetch()}
            >
              Retry block statistics
            </button>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <BlocksTimeline
          blocks={blocks}
          blockTime={chain.data?.blockTime}
          newHashes={newHashes}
          loading={blocksQuery.isPending}
          error={blocksQuery.isError}
          onRetry={() => void blocksQuery.refetch()}
        />
        <TransactionHistoryPanel network={network} title="Block Transactions" />
      </div>
    </section>
  );
}
