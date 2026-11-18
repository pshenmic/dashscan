import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Gauge,
  Hash,
  Info,
  Layers,
  Shield,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Pie, PieChart } from "recharts";
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

const compactDash = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumSignificantDigits: 3,
});

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
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
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
  const activeShare = shares?.find(({ label }) => label === activeLabel);
  const centerDuffs = activeShare?.amount ?? totalReward ?? 0;
  const metrics = [
    { label: "Nonce", icon: Hash, value: metricNumber(Number(block.nonce), 0) },
    {
      label: "Difficulty",
      icon: Gauge,
      value: metricNumber(block.difficulty, 8),
    },
    {
      label: "Version",
      icon: Tag,
      value: metricNumber(block.version, 0),
    },
  ];

  return (
    <div className="grid items-stretch gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section
        aria-label="Block metadata"
        className="flex min-w-0 flex-col gap-3 pt-2 sm:px-4"
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
                <dt className="col-start-1 row-start-1 text-xs text-muted-foreground">
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
              },
            ].map(({ label, value }) => (
              <dl key={label}>
                <dt className="text-xs text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 min-w-0">
                  <HashValue value={value} />
                </dd>
              </dl>
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
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
        </div>
      </section>
      <section
        aria-label="Block summary"
        className="flex min-w-0 flex-col gap-4 rounded-3xl bg-card p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Block Reward</h3>
              <InfoPopover
                label="About reward distribution"
                trigger={<Info className="size-4 text-muted-foreground" />}
              >
                Includes transaction fees. The Platform credit pool is part of
                the masternode reward. Treasury payouts fund approved proposals
                in superblocks only.
              </InfoPopover>
            </div>
            <p className="mt-1 font-semibold tabular-nums">
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
          <dl className="space-y-1 text-sm sm:text-right">
            <dt className="text-muted-foreground">
              <InfoPopover
                label="About transaction fees"
                trigger="Transaction fees"
              >
                Total fees paid by transactions in this block. Already included
                in the block reward.
              </InfoPopover>
            </dt>
            <dd className="font-semibold tabular-nums">
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
        {reward.isPending ? (
          <SkeletonBar className="h-48 w-full rounded-3xl" />
        ) : shares && totalReward != null && totalReward > 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-3xl dash-home-panel p-4 sm:flex-row sm:p-5">
            <div className="relative shrink-0" aria-hidden="true">
              <PieChart width={174} height={174} accessibilityLayer={false}>
                <Pie
                  data={shares.map((share) => ({
                    ...share,
                    opacity:
                      activeShare && activeShare.label !== share.label
                        ? 0.5
                        : 1,
                    stroke:
                      activeShare?.label === share.label
                        ? "var(--brand)"
                        : "none",
                  }))}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={59}
                  outerRadius={86}
                  startAngle={90}
                  endAngle={-270}
                  cornerRadius={4}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                  rootTabIndex={-1}
                  onMouseEnter={(_, index) =>
                    setActiveLabel(shares[index].label)
                  }
                  onMouseLeave={() => setActiveLabel(null)}
                  onClick={(_, index) => setActiveLabel(shares[index].label)}
                />
              </PieChart>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-xl tabular-nums">
                  {centerDuffs > 0 && centerDuffs < 100_000
                    ? "<0.001"
                    : compactDash.format(centerDuffs / 100_000_000)}
                </strong>
                <span className="text-xs text-muted-foreground">DASH</span>
              </div>
            </div>
            <div className="w-full min-w-0 flex-1">
              <dl className="grid grid-rows-[repeat(4,minmax(1.25rem,auto))] gap-y-3 text-sm">
                {shares.map(({ label, amount, fill }) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3"
                  >
                    <dt>
                      <button
                        type="button"
                        aria-pressed={activeShare?.label === label}
                        className="flex items-center gap-2 rounded text-left text-muted-foreground aria-pressed:text-foreground focus-visible:outline-ring"
                        onFocus={() => setActiveLabel(label)}
                        onBlur={() => setActiveLabel(null)}
                        onClick={() => setActiveLabel(label)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setActiveLabel(null);
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: fill }}
                        />
                        {label}
                      </button>
                    </dt>
                    <dd className="text-right font-semibold tabular-nums">
                      {metricDuffs(amount)}
                      <span className="sr-only"> DASH</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : null}
        <dl className="mt-3 grid grid-cols-[1.1fr_1fr_1fr] divide-x divide-border rounded-2xl bg-card p-3 text-sm sm:grid-cols-3 sm:p-4">
          <div>
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers aria-hidden="true" className="size-3.5 shrink-0" />{" "}
              Confirmations
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
              ChainLock
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
