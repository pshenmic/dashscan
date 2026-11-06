import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RelativeTime } from "@/components/relative-time";
import { Badge } from "@/components/ui/badge";
import { blockRewardQueryOptions } from "@/lib/api/blocks";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import type { ApiBlock } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import type { Network } from "@/lib/store";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { CopyButton } from "./copy-button";
import { MissingApiData } from "./missing-api-data";
import { SkeletonBar } from "./skeleton";

function HashValue({ value }: { value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span title={value} className="dash-data-mono min-w-0 truncate text-sm">
        {value}
      </span>
      <CopyButton value={value} />
    </div>
  );
}

function SummaryMetric({
  label,
  name,
  children,
}: {
  label: string;
  name: "status" | "transactions" | "miner" | "reward";
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-24 min-w-0 items-center gap-4 overflow-hidden rounded-3xl bg-brand/4 p-3">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-4 size-28 rotate-30 bg-brand"
        style={{
          mask: `url('/icons/block-detail/${name}-decor.svg') center / contain no-repeat`,
        }}
      />
      {name === "miner" || name === "reward" ? (
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full border border-action-subtle bg-card">
          <img
            src={`/icons/block-detail/${name}.svg`}
            alt=""
            width={20}
            height={20}
            className="size-5 object-contain"
          />
        </span>
      ) : (
        <img
          src={`/icons/block-detail/${name}.svg`}
          alt=""
          width={48}
          height={48}
          className="relative size-12 shrink-0"
        />
      )}
      <div className="relative min-w-0 space-y-2">
        <p className="text-sm leading-tight text-muted-foreground">{label}</p>
        <div className="text-base font-extrabold tabular-nums">{children}</div>
      </div>
    </div>
  );
}

export function BlockDetailOverview({
  block,
  network,
}: {
  block: ApiBlock;
  network: Network;
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
  const chainLocked =
    firstTransaction?.blockHash === block.hash
      ? firstTransaction.chainLocked
      : null;
  const metadata: { label: string; value: ReactNode }[] = [
    {
      label: "Timestamp",
      value: (
        <div className="flex flex-wrap justify-end gap-2">
          <time dateTime={block.timestamp}>
            {formatDateTime(new Date(block.timestamp))}
          </time>
          <span className="rounded-full border border-border px-2 text-muted-foreground">
            <RelativeTime timestamp={block.timestamp} />
          </span>
        </div>
      ),
    },
    { label: "Confirmations", value: metricNumber(block.confirmations, 0) },
    { label: "Merkle Root", value: <HashValue value={block.merkleRoot} /> },
    {
      label: "Bits",
      value: (
        <MissingApiData
          inline
          description="Return the compact proof-of-work target (bits) in the block response."
        />
      ),
    },
    { label: "Nonce", value: metricNumber(Number(block.nonce), 0) },
    { label: "Difficulty", value: metricNumber(block.difficulty, 8) },
    { label: "Version", value: metricNumber(block.version, 0) },
    { label: "Size", value: `${metricNumber(block.size, 0)} bytes` },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section
        aria-label="Block metadata"
        className="min-w-0 rounded-3xl bg-card px-4 py-4 sm:px-6"
      >
        <dl className="flex h-full flex-col justify-between gap-3 text-sm">
          {metadata.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 text-right font-medium tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-label="Block summary"
        className="flex min-w-0 flex-col gap-4 rounded-3xl bg-card p-4"
      >
        <div className="flex min-w-0 items-center gap-4 rounded-3xl bg-brand/4 p-3">
          <img
            src="/icons/block-detail/hash.svg"
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm text-muted-foreground">Block Hash</p>
            <HashValue value={block.hash} />
          </div>
        </div>
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <SummaryMetric label="Status" name="status">
            {status.isPending ? (
              <SkeletonBar className="w-28" />
            ) : status.isError ? (
              <button
                type="button"
                onClick={() => void status.refetch()}
                className="text-sm text-accent underline"
              >
                Retry
              </button>
            ) : typeof chainLocked === "boolean" ? (
              <Badge
                variant="outline"
                className={
                  chainLocked
                    ? "border-brand bg-action-subtle text-brand"
                    : "border-border text-muted-foreground"
                }
              >
                {chainLocked ? "ChainLocked" : "Not ChainLocked"}
              </Badge>
            ) : (
              <MissingApiData
                inline
                description="Return the block ChainLock status. Confirmations alone do not establish a ChainLock."
              />
            )}
          </SummaryMetric>
          <SummaryMetric label="Transactions" name="transactions">
            {metricNumber(block.txCount, 0)}
          </SummaryMetric>
          <SummaryMetric label="Mined by" name="miner">
            <MissingApiData
              inline
              description="Return the identified mining pool for this block, or null when unknown. A payout address is not a pool name."
            />
          </SummaryMetric>
          <SummaryMetric label="Block Subsidy" name="reward">
            {reward.isPending ? (
              <SkeletonBar className="w-28" />
            ) : reward.isError ? (
              <button
                type="button"
                onClick={() => void reward.refetch()}
                className="text-sm text-accent underline"
              >
                Retry
              </button>
            ) : reward.data?.subsidy != null ? (
              <span
                className="break-words"
                title={`${metricDuffs(reward.data.subsidy)} DASH`}
              >
                {metricDuffs(reward.data.subsidy, 6)}{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  DASH
                </span>
              </span>
            ) : (
              <MissingApiData
                inline
                description="Return the block subsidy in duffs for this height, excluding transaction fees."
              />
            )}
          </SummaryMetric>
        </div>
      </section>
    </div>
  );
}
