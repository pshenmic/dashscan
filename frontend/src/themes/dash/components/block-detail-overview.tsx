import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Gauge,
  Hash,
  Layers,
  Shield,
  ShieldCheck,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { RelativeTime } from "@/components/relative-time";
import { blockRewardQueryOptions } from "@/lib/api/blocks";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type { ApiBlock } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import type { Network } from "@/lib/store";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { CopyButton } from "./copy-button";
import { InfoPopover } from "./info-popover";
import { SkeletonBar } from "./skeleton";

function HashValue({ value }: { value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span
        title={value}
        className="dash-data-mono min-w-0 flex-1 truncate text-sm"
      >
        {value}
      </span>
      <CopyButton value={value} />
    </div>
  );
}

function Retry({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-accent underline"
    >
      Retry
    </button>
  );
}

export function BlockDetailOverview({
  block,
  network,
  navigation,
}: {
  block: ApiBlock;
  network: Network;
  navigation: ReactNode;
}) {
  const reward = useQuery(
    blockRewardQueryOptions({ network, height: block.height }),
  );
  const status = useQuery({
    ...transactionsQueryOptions({
      network,
      blockHeight: block.height,
      page: 1,
      limit: 1,
      order: "asc",
    }),
    refetchInterval: 30_000,
  });
  const firstTransaction = status.data?.resultSet[0];
  const payout = reward.data;
  const totalReward =
    payout?.miner != null &&
    payout.masternode != null &&
    payout.treasury != null
      ? payout.miner + payout.masternode + payout.treasury
      : null;
  const shares =
    payout?.miner != null &&
    payout.masternode != null &&
    payout.platform != null &&
    payout.treasury != null &&
    payout.platform <= payout.masternode
      ? [
          { label: "Miner", amount: payout.miner, fill: "var(--chart-1)" },
          {
            label: "Masternode",
            amount: payout.masternode - payout.platform,
            fill: "var(--chart-5)",
          },
          {
            label: "Platform credit pool",
            amount: payout.platform,
            fill: "var(--chart-4)",
          },
          {
            label: "Treasury",
            amount: payout.treasury,
            fill: "var(--muted-foreground)",
          },
        ].filter(({ amount }) => amount > 0)
      : null;
  const chainLocked =
    firstTransaction?.blockHash === block.hash
      ? firstTransaction.chainLocked
      : null;
  const metrics = [
    { label: "Nonce", icon: Hash, value: metricNumber(Number(block.nonce), 0) },
    {
      label: "Difficulty",
      icon: Gauge,
      value: metricNumber(block.difficulty, 8),
    },
    {
      label: "Block version",
      icon: Tag,
      value: metricNumber(block.version, 0),
    },
  ];

  return (
    <div className="grid items-stretch gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section
        aria-label="Block metadata"
        className="flex min-w-0 flex-col gap-3 pt-2"
      >
        <h1 className="dash-heading-page xl:dash-heading-hero">
          <span className="text-accent">
            {block.superblock === true ? "Superblock" : "Block"}
          </span>{" "}
          <span className="whitespace-nowrap">
            #{metricNumber(block.height, 0)}
          </span>
        </h1>
        <div className="flex flex-1 flex-col rounded-3xl border border-border bg-card px-4 py-3">
          <div className="flex flex-1 flex-col justify-between gap-3">
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-1">
              <div className="col-start-2 row-start-1 justify-self-end">
                {navigation}
              </div>
              <dl className="contents">
                <dt className="col-start-1 row-start-1 text-xs font-medium text-foreground">
                  Timestamp
                </dt>
                <dd className="col-span-full mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm">
                  <time dateTime={block.timestamp}>
                    {formatDateTime(new Date(block.timestamp))}
                  </time>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    <RelativeTime timestamp={block.timestamp} />
                  </span>
                </dd>
              </dl>
            </div>
            {[
              { label: "Block Hash", value: block.hash },
              {
                label: "Merkle Root",
                value: block.merkleRoot,
                description:
                  "A single hash derived from all transaction IDs in this block. It can be used to verify that a transaction is included.",
              },
            ].map(({ label, value, description }) => (
              <dl key={label}>
                <dt className="text-xs font-medium text-foreground">
                  {description ? (
                    <InfoPopover label={label} trigger={label} side="right">
                      {description}
                    </InfoPopover>
                  ) : (
                    label
                  )}
                </dt>
                <dd className="mt-1 min-w-0">
                  <HashValue value={value} />
                </dd>
              </dl>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card p-3 text-sm sm:p-4">
          {metrics.map(({ label, icon: Icon, value }) => (
            <div
              key={label}
              className="min-w-0 not-first:pl-2 sm:not-first:pl-4"
            >
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                {label}
              </dt>
              <dd className="mt-1 wrap-anywhere text-base leading-5 font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-label="Block summary"
        className="flex min-w-0 flex-col lg:pt-2"
      >
        <div className="flex flex-1 flex-col rounded-3xl border border-border bg-card p-5 shadow-[var(--card-shadow)] sm:p-7 lg:rounded-tl-[3rem]">
          <div className="grid grid-cols-1 items-start gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h3 className="text-sm font-semibold">
                <InfoPopover
                  label="Block Reward"
                  trigger="Block Reward"
                  side="right"
                >
                  Includes transaction fees. The Platform credit pool is part of
                  the masternode reward. Treasury payouts fund approved
                  proposals in superblocks only.
                </InfoPopover>
              </h3>
              <p className="mt-1 min-h-8 sm:min-h-9 break-words text-2xl font-bold tabular-nums text-accent sm:text-3xl">
                {reward.isPending ? (
                  <SkeletonBar className="w-24" />
                ) : reward.isError ? (
                  <Retry onClick={() => void reward.refetch()} />
                ) : totalReward != null ? (
                  `${metricDuffs(totalReward)} DASH`
                ) : (
                  "—"
                )}
              </p>
            </div>
            <dl className="relative w-max min-w-0 max-w-full -translate-y-1 justify-self-end space-y-1 rounded-3xl border border-border bg-card px-5 py-3 text-sm sm:-translate-y-2 sm:px-6">
              <dt className="text-muted-foreground">
                <InfoPopover
                  label="Transaction fees"
                  side="right"
                  trigger="Transaction fees"
                >
                  Total fees paid by transactions in this block. Already
                  included in the block reward.
                </InfoPopover>
              </dt>
              <dd
                className="truncate text-lg font-semibold tabular-nums text-foreground"
                title={
                  payout?.fees != null
                    ? `${metricDuffs(payout.fees)} DASH`
                    : undefined
                }
              >
                {reward.isPending ? (
                  <SkeletonBar className="w-24" />
                ) : payout?.fees != null ? (
                  `${metricDuffs(payout.fees)} DASH`
                ) : (
                  "—"
                )}
              </dd>
            </dl>
          </div>
          <div className="mt-3 grid min-h-[7.25rem] flex-1 items-center border-t border-border pt-3">
            {reward.isPending ? (
              <SkeletonBar className="h-20 w-full rounded-2xl" />
            ) : shares && totalReward != null && totalReward > 0 ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {shares.map(({ label, amount, fill }) => (
                  <div key={label} className="grid min-w-0 gap-y-0.5 text-sm">
                    <dt className="text-xs font-medium text-foreground">
                      {label}
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {metricDuffs(amount)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        DASH
                      </span>
                    </dd>
                    <div
                      aria-hidden="true"
                      className="col-span-full h-1.5 overflow-hidden rounded-full bg-secondary"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(amount / totalReward) * 100}%`,
                          backgroundColor: fill,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                {totalReward === 0
                  ? "No payouts in this block."
                  : "Reward breakdown unavailable."}
              </p>
            )}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-[1.1fr_1fr_1fr] divide-x divide-border rounded-2xl border border-border bg-card p-3 text-sm sm:grid-cols-3 sm:p-4">
          <div>
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers aria-hidden="true" className="size-3.5 shrink-0" />{" "}
              <InfoPopover
                label="Confirmations"
                trigger="Confirmations"
                side="right"
              >
                Starts at 1 for the latest block. Each new block added after it
                increases the count by 1.
              </InfoPopover>
            </dt>
            <dd className="mt-1 text-base leading-5 font-semibold tabular-nums">
              {metricNumber(block.confirmations, 0)}
            </dd>
          </div>
          <div className="pl-2 sm:pl-4">
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              {chainLocked === true && !status.isError ? (
                <ShieldCheck
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-success"
                />
              ) : (
                <Shield aria-hidden="true" className="size-3.5 shrink-0" />
              )}
              <InfoPopover label="ChainLock" trigger="ChainLock" side="right">
                A ChainLock is a masternode quorum signature for a block. Dash
                Core nodes reject competing blocks at the locked height.
              </InfoPopover>
            </dt>
            <dd className="mt-1 text-base leading-5 font-semibold">
              {status.isPending ? (
                <SkeletonBar className="w-16" />
              ) : status.isError ? (
                <Retry onClick={() => void status.refetch()} />
              ) : chainLocked == null ? (
                "—"
              ) : chainLocked ? (
                <span className="text-success">Locked</span>
              ) : (
                "Not locked"
              )}
            </dd>
          </div>
          <div className="pl-2 sm:pl-4">
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <Box aria-hidden="true" className="size-3.5 shrink-0" /> Size
            </dt>
            <dd className="mt-1 text-base leading-5 font-semibold tabular-nums">
              {metricNumber(block.size, 0)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                bytes
              </span>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
