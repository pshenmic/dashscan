import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import type { ReactNode } from "react";
import { RelativeTime } from "@/components/relative-time";
import { Badge } from "@/components/ui/badge";
import { transactionQueryOptions } from "@/lib/api/transactions";
import { formatDateTime } from "@/lib/format";
import { appStore } from "@/lib/store";
import { CopyButton } from "@/themes/dash/components/copy-button";
import { ExtraPayloadCard } from "@/themes/dash/components/extra-payload";
import { MissingApiData } from "@/themes/dash/components/missing-api-data";
import { PageStatus } from "@/themes/dash/components/page-status";
import { TransactionDetailSkeleton } from "@/themes/dash/components/transaction-detail-skeleton";
import { TransactionInputsOutputs } from "@/themes/dash/components/transaction-inputs-outputs";
import { TransactionTypeBadge } from "@/themes/dash/components/transaction-type-badge";
import {
  TransactionAmount,
  TransactionValueDistribution,
} from "@/themes/dash/components/transaction-value-distribution";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionTotals } from "@/themes/dash/lib/transaction-detail";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 py-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{children}</dd>
    </div>
  );
}

function BlockLink({ height }: { height: number }) {
  return (
    <Link
      to="/blocks/$hashOrHeight"
      params={{ hashOrHeight: String(height) }}
      search={{ page: 1, limit: 10 }}
      className="inline-flex items-center gap-2 rounded-full bg-action-subtle px-3 py-1 text-accent hover:underline"
    >
      #{metricNumber(height, 0)}
    </Link>
  );
}

export default function TransactionDetailPage({ hash }: { hash: string }) {
  const network = useStore(appStore, (state) => state.network);
  const validHash = /^[a-fA-F0-9]{64}$/.test(hash);
  const query = useQuery({
    ...transactionQueryOptions({ network, hash }),
    enabled: validHash,
    refetchInterval: 30_000,
    retry: 1,
  });
  if (!validHash) return <PageStatus message="Invalid transaction hash." />;
  if (query.isPending) return <TransactionDetailSkeleton />;
  const transaction = query.data;
  if (!transaction)
    return (
      <main className="mx-auto max-w-[1440px] px-4 py-16 text-center">
        <p role="alert">Could not load this transaction.</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 text-accent underline"
        >
          Retry
        </button>
      </main>
    );
  const totals = transactionTotals(transaction);
  const hasBlock =
    Number.isSafeInteger(transaction.blockHeight) &&
    transaction.blockHeight >= 0 &&
    Boolean(transaction.blockHash);
  const instantLocked =
    transaction.instantLock === true ||
    (typeof transaction.instantLock === "string" &&
      transaction.instantLock.length > 0);
  const timestamp =
    transaction.timestamp && Number.isFinite(Date.parse(transaction.timestamp))
      ? transaction.timestamp
      : null;
  const confirmationLabel =
    transaction.confirmations > 0 ? "Confirmed" : "Unconfirmed";
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
      <header className="space-y-4 rounded-3xl bg-card p-4 sm:p-6">
        <h1 className="text-xl font-medium text-muted-foreground">
          Transaction
        </h1>
        <div className="group flex min-w-0 items-center gap-3">
          <img
            src="/icons/transaction-detail/hash.svg"
            alt=""
            width={31}
            height={31}
            className="size-8 shrink-0 dark:hidden"
          />
          <img
            src="/icons/transaction-detail/hash-dark.svg"
            alt=""
            width={31}
            height={31}
            className="hidden size-8 shrink-0 dark:block"
          />
          <span className="min-w-0 break-all font-mono text-base leading-relaxed sm:text-2xl">
            {transaction.hash}
          </span>
          <CopyButton value={transaction.hash} />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-secondary px-3 py-1">
            <span className="text-muted-foreground">Fee:</span>
            {!totals.feeApplicable ? (
              "Not applicable"
            ) : totals.fee !== null ? (
              <TransactionAmount value={totals.fee} />
            ) : (
              <MissingApiData
                inline
                description="Return the transaction fee in duffs, or all input values needed to calculate it. Special transactions require their protocol-specific fee calculation."
              />
            )}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Block:</span>
            {hasBlock ? (
              <BlockLink height={transaction.blockHeight} />
            ) : (
              "Unconfirmed"
            )}
          </span>
        </div>
      </header>
      {query.isError && (
        <output className="block text-sm text-muted-foreground">
          Transaction updates are unavailable. Showing the last loaded data.
        </output>
      )}
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <section
          aria-label="Transaction details"
          className="min-w-0 rounded-3xl bg-card px-4 py-4 sm:px-6"
        >
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1.3fr]">
            <div className="min-w-0 space-y-3 rounded-3xl bg-secondary p-4">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant="outline"
                  className="max-w-full border-brand bg-action-subtle text-accent"
                >
                  {transaction.chainLocked === true
                    ? "ChainLocked"
                    : confirmationLabel}
                </Badge>
              </dd>
            </div>
            <div className="min-w-0 space-y-3 rounded-3xl bg-secondary p-4">
              <dt className="text-sm text-muted-foreground">InstantSend</dt>
              <dd>
                <Badge
                  variant="outline"
                  className={
                    instantLocked
                      ? "border-brand bg-action-subtle text-accent"
                      : "border-border text-muted-foreground"
                  }
                >
                  {instantLocked
                    ? "Locked"
                    : transaction.instantLock === false
                      ? "Not locked"
                      : "—"}
                </Badge>
              </dd>
            </div>
            <div className="min-w-0 space-y-3 rounded-3xl bg-secondary p-4">
              <dt className="text-sm text-muted-foreground">
                Transaction type
              </dt>
              <dd>
                <TransactionTypeBadge type={transaction.type} />
              </dd>
            </div>
          </dl>
          <dl className="mt-6 divide-y divide-border/50">
            <DetailRow label="TxID">
              <div className="group flex items-center gap-1">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs"
                  title={transaction.hash}
                >
                  {transaction.hash}
                </span>
                <CopyButton value={transaction.hash} />
              </div>
            </DetailRow>
            <DetailRow label="Block">
              {hasBlock ? (
                <BlockLink height={transaction.blockHeight} />
              ) : (
                "Unconfirmed"
              )}
            </DetailRow>
            <DetailRow label="Timestamp">
              {timestamp ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <time dateTime={timestamp}>{formatDateTime(timestamp)}</time>
                  <span className="rounded-lg border border-border px-2 py-1 text-muted-foreground">
                    <RelativeTime timestamp={timestamp} />
                  </span>
                </div>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Confirmations">
              {transaction.confirmations == null
                ? "—"
                : metricNumber(transaction.confirmations, 0)}
            </DetailRow>
            {totals.monetary && (
              <>
                {transaction.vIn?.length > 0 && !totals.coinbase && (
                  <DetailRow label="Total input">
                    <TransactionAmount value={totals.input} />
                  </DetailRow>
                )}
                <DetailRow label="Total output">
                  <TransactionAmount value={totals.output} />
                </DetailRow>
              </>
            )}
            <DetailRow label="Fee">
              {!totals.feeApplicable ? (
                "Not applicable"
              ) : (
                <TransactionAmount value={totals.fee} />
              )}
            </DetailRow>
            <DetailRow label="Size">
              {transaction.size == null
                ? "—"
                : `${metricNumber(transaction.size, 0)} bytes`}
            </DetailRow>
          </dl>
        </section>
        <TransactionValueDistribution
          transaction={transaction}
          totals={totals}
        />
      </div>
      {transaction.extraPayload && (
        <ExtraPayloadCard
          txType={transaction.type}
          payload={transaction.extraPayload}
        />
      )}
      {totals.monetary && (
        <TransactionInputsOutputs
          transaction={transaction}
          coinbase={totals.coinbase}
        />
      )}
    </main>
  );
}
