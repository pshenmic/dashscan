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
import { PageStatus } from "@/themes/dash/components/page-status";
import { TransactionAmount } from "@/themes/dash/components/transaction-amount";
import { TransactionDetailSkeleton } from "@/themes/dash/components/transaction-detail-skeleton";
import { TransactionInputsOutputs } from "@/themes/dash/components/transaction-inputs-outputs";
import { TransactionTypeBadge } from "@/themes/dash/components/transaction-type-badge";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionTotals } from "@/themes/dash/lib/transaction-detail";

const summaryGroup =
  "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-3 rounded-3xl border border-border bg-card p-4 sm:p-5";
const summaryDetails = "grid justify-items-start gap-2";

function MetaBadge({
  label,
  children,
  positive = false,
}: {
  label: string;
  children: ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>
        <Badge
          variant="outline"
          className={
            positive
              ? "h-6 border-success/20 bg-success/10 text-success"
              : "h-6 border-foreground/12 bg-foreground/5 text-foreground/70"
          }
        >
          {children}
        </Badge>
      </dd>
    </div>
  );
}

function BlockLink({ height }: { height: number }) {
  return (
    <Link
      to="/blocks/$hashOrHeight"
      params={{ hashOrHeight: String(height) }}
      search={{ page: 1, limit: 10 }}
      className="text-accent hover:underline"
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
  const confirmations = transaction.confirmations;
  const hasConfirmations =
    confirmations != null &&
    Number.isSafeInteger(confirmations) &&
    confirmations >= 0;
  const size =
    transaction.size == null
      ? "—"
      : `${metricNumber(transaction.size, 0)} bytes`;
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16">
      <header className="min-w-0 space-y-2">
        <div className="group flex min-w-0 items-center gap-2">
          <h1 className="dash-heading-page flex min-w-0 items-baseline gap-[0.25em] xl:dash-heading-hero">
            <span className="shrink-0 text-accent">Transaction</span>{" "}
            <span className="truncate" title={transaction.hash}>
              {transaction.hash}
            </span>
          </h1>
          <CopyButton value={transaction.hash} label="Copy TxID" />
        </div>
        {hasBlock && timestamp && (
          <p className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm">
            <span className="sr-only">Block time: </span>
            <time dateTime={timestamp}>{formatDateTime(timestamp)}</time>
            <span className="text-xs text-muted-foreground">
              <RelativeTime timestamp={timestamp} />
            </span>
          </p>
        )}
      </header>
      {query.isError && (
        <output className="block text-sm text-muted-foreground">
          Transaction updates are unavailable. Showing the last loaded data.
        </output>
      )}
      <div
        className={`grid gap-4 sm:grid-cols-2 ${totals.monetary ? "lg:grid-cols-3" : ""}`}
      >
        <section aria-label="Block" className={summaryGroup}>
          <div className="min-w-0 max-w-full space-y-2">
            <h2 className="text-xl font-extrabold">Block</h2>
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">
              {hasBlock ? (
                <BlockLink height={transaction.blockHeight} />
              ) : confirmations === 0 ? (
                "Unconfirmed"
              ) : (
                "—"
              )}
            </p>
          </div>
          <dl className={summaryDetails}>
            <MetaBadge label="Confirmations">
              {hasConfirmations ? metricNumber(confirmations, 0) : "—"}
            </MetaBadge>
            {hasBlock && (
              <MetaBadge
                label="ChainLock"
                positive={transaction.chainLocked === true}
              >
                {transaction.chainLocked === true
                  ? "Locked"
                  : transaction.chainLocked === false
                    ? "Not locked"
                    : "—"}
              </MetaBadge>
            )}
          </dl>
        </section>
        {totals.monetary && (
          <section aria-label="Total output" className={summaryGroup}>
            <div className="min-w-0 max-w-full space-y-2">
              <h2 className="text-xl font-extrabold">Total output</h2>
              <p className="wrap-anywhere text-2xl font-bold tabular-nums sm:text-3xl">
                <TransactionAmount value={totals.output} />
              </p>
            </div>
            {((!totals.coinbase && transaction.vIn?.length > 0) ||
              totals.feeApplicable) && (
              <dl className={summaryDetails}>
                {!totals.coinbase && transaction.vIn?.length > 0 && (
                  <MetaBadge label="Total input">
                    <TransactionAmount value={totals.input} />
                  </MetaBadge>
                )}
                {totals.feeApplicable && (
                  <MetaBadge label="Fee">
                    <TransactionAmount value={totals.fee} />
                  </MetaBadge>
                )}
              </dl>
            )}
          </section>
        )}
        <section aria-label="Transaction properties" className={summaryGroup}>
          <dl className={summaryDetails}>
            <div className="flex items-center gap-2">
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd>
                <TransactionTypeBadge type={transaction.type} />
              </dd>
            </div>
            {transaction.coinjoin && (
              <MetaBadge label="Classification">CoinJoin</MetaBadge>
            )}
          </dl>
          <dl className={summaryDetails}>
            <MetaBadge label="Size">{size}</MetaBadge>
            {totals.monetary && !totals.coinbase && (
              <MetaBadge label="InstantSend" positive={instantLocked}>
                {instantLocked
                  ? "Locked"
                  : transaction.instantLock === false
                    ? "Not locked"
                    : "—"}
              </MetaBadge>
            )}
          </dl>
        </section>
      </div>
      {totals.monetary && (
        <TransactionInputsOutputs
          transaction={transaction}
          coinbase={totals.coinbase}
        />
      )}
      <ExtraPayloadCard
        txType={transaction.type}
        payload={transaction.extraPayload}
      />
    </main>
  );
}
