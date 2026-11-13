import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useId } from "react";
import { assetStatsQueryOptions } from "@/lib/api/stats";
import {
  transactionQueryOptions,
  transactionsQueryOptions,
} from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import { formatCompact } from "@/lib/format";
import { homeBlocksQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import {
  assetTransferAmount,
  creditsEquivalent,
} from "@/themes/dash/lib/asset-metrics";
import {
  useHistoryRange,
  useHomeChainHistory,
} from "@/themes/dash/lib/home-history";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";
import { BlockAge } from "./block-age";
import { ChainHistoryChart } from "./chain-history-chart";
import { HomeIcon } from "./home-icon";
import { InfoPopover } from "./info-popover";
import { MissingApiData } from "./missing-api-data";

const compactCredits = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const exactCredits = new Intl.NumberFormat("en-US");

function CreditsEquivalentBadge({
  duffs,
  loading,
}: {
  duffs: string | number | null | undefined;
  loading: boolean;
}) {
  const credits = creditsEquivalent(duffs);
  if (!loading && credits == null) return null;
  return (
    <span className="shrink-0 whitespace-nowrap rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
      {loading ? (
        <output aria-label="Loading credits equivalent">… Credits</output>
      ) : credits != null ? (
        <InfoPopover
          label="About the credits equivalent"
          trigger={`${compactCredits.format(credits).replaceAll(",", "\u00a0")} Credits`}
        >
          {exactCredits.format(credits).replaceAll(",", "\u00a0")} credits
          equivalent. Conversion: 1 DASH = 100 billion credits. This is the
          displayed Core amount converted to credits, not a measured Platform
          balance or the actual credits issued or burned after fees.
        </InfoPopover>
      ) : null}
    </span>
  );
}

function TransferRow({
  transaction,
  detail,
  loading,
  error,
  retry,
}: {
  transaction: ApiTransaction;
  detail?: ApiTransaction;
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
}) {
  const deposit = transaction.type === "ASSET_LOCK";
  const amount = assetTransferAmount(deposit ? detail : transaction);
  return (
    <li className="grid min-h-[66px] min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-card px-3 py-[18px] text-sm ring-1 ring-border">
      <span className="text-muted-foreground">
        {transaction.timestamp ? (
          <BlockAge
            timestamp={transaction.timestamp}
            blockHeight={transaction.blockHeight}
          />
        ) : (
          "Pending"
        )}
      </span>
      <Link
        to="/transactions/$hash"
        params={{ hash: transaction.hash }}
        title={transaction.hash}
        className={`rounded-full border px-2 py-1 text-xs hover:underline focus-visible:outline-2 focus-visible:outline-ring ${deposit ? "border-action-subtle bg-action-subtle text-accent" : "border-border bg-foreground/12"}`}
      >
        {deposit ? "Deposit" : "Withdrawal"}
      </Link>
      <span
        className="min-w-0 truncate text-right font-extrabold tabular-nums"
        title={
          amount == null
            ? undefined
            : `${deposit ? "+" : "−"} ${transactionAmount(amount)}`
        }
      >
        {loading ? (
          "…"
        ) : amount == null ? (
          "—"
        ) : (
          <>
            {deposit ? "+" : "−"}{" "}
            {transactionAmount(amount).replace(/ DASH$/, "")}{" "}
            <span className="font-medium">DASH</span>
          </>
        )}
      </span>
      {error ? (
        <button
          type="button"
          className="text-xs text-destructive underline"
          onClick={retry}
        >
          Retry amount
        </button>
      ) : !loading && amount == null ? (
        <MissingApiData
          label="Unavailable"
          inline
          description="The transaction response does not contain a valid transfer amount. AssetLock totals cannot be used because they include change."
        />
      ) : null}
    </li>
  );
}

function AssetMetric({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[120px] min-w-0 flex-col justify-end gap-3 rounded-3xl bg-surface-subtle px-4 py-4 inset-ring inset-ring-border sm:px-6">
      <img
        src={`/icons/home/${icon}.svg`}
        alt=""
        width={24}
        height={24}
        className="size-6"
      />
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-medium leading-[1.1] text-muted-foreground">
          {label}
        </h3>
        {children}
      </div>
    </div>
  );
}

export function HomeAssets() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const blocks = useQuery(homeBlocksQueryOptions(network));
  const assetRange = useHistoryRange(1, 24);
  const assetStats = useQuery(
    assetStatsQueryOptions({ network, ...assetRange }),
  );
  const poolHistory = useHomeChainHistory(network);
  const locked = assetStats.data?.assetLock;
  const unlocked = assetStats.data?.assetUnlock;
  const locks = useQuery({
    ...transactionsQueryOptions({
      network,
      transactionType: "ASSET_LOCK",
      page: 1,
      limit: 3,
      order: "desc",
    }),
    refetchInterval: 30_000,
  });
  const unlocks = useQuery({
    ...transactionsQueryOptions({
      network,
      transactionType: "ASSET_UNLOCK",
      page: 1,
      limit: 3,
      order: "desc",
    }),
    refetchInterval: 30_000,
  });
  const deposits = locks.isError
    ? []
    : (locks.data?.resultSet ?? []).filter(
        (transaction) => transaction.type === "ASSET_LOCK",
      );
  const withdrawals = unlocks.isError
    ? []
    : (unlocks.data?.resultSet ?? []).filter(
        (transaction) => transaction.type === "ASSET_UNLOCK",
      );
  const details = useQueries({
    queries: deposits.map((transaction) => ({
      ...transactionQueryOptions({ network, hash: transaction.hash }),
      staleTime: 60_000,
    })),
  });
  const latest = [...(blocks.data?.resultSet ?? [])].sort(
    (first, second) => second.height - first.height,
  )[0];
  const balance =
    !blocks.isError &&
    latest?.creditPoolBalance != null &&
    Number.isFinite(latest.creditPoolBalance) &&
    latest.creditPoolBalance >= 0
      ? latest.creditPoolBalance
      : null;
  const state = (
    pending: boolean,
    error: boolean,
    empty: boolean,
    retry: () => void,
  ) =>
    error ? (
      <p
        role="alert"
        className="rounded-xl bg-card p-4 text-sm text-destructive"
      >
        Transfers unavailable.{" "}
        <button type="button" className="underline" onClick={retry}>
          Try again
        </button>
      </p>
    ) : pending ? (
      <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">
        Loading transfers…
      </p>
    ) : empty ? (
      <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">
        No transfers found.
      </p>
    ) : null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-10 lg:gap-16"
    >
      <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,608fr)_minmax(0,672fr)]">
        <div className="min-w-0">
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h2
            id={titleId}
            className="dash-heading-page mt-3 break-words sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">AssetLock/Unlock</span>{" "}
            Stats
          </h2>
          <p className="dash-body mt-3 text-muted-foreground">
            Track deposits to Dash Platform and withdrawals to Dash Core.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {(["ASSET_LOCK", "ASSET_UNLOCK"] as const).map((type) => (
              <Link
                key={type}
                to="/transactions"
                search={{ transaction_type: type }}
                className="dash-home-action dash-home-action-subtle flex min-h-12 items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2 text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                Explore {type === "ASSET_LOCK" ? "AssetLocks" : "AssetUnlocks"}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
                  <HomeIcon name="explore" />
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="relative isolate min-w-0 xl:min-h-[290px]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 -z-10 h-[254px] rounded-3xl bg-card shadow-card sm:inset-x-[30px]"
          />
          <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-6 sm:mx-[30px]">
            <h3 className="dash-heading-section">
              <InfoPopover
                label="About Platform transfers"
                trigger={
                  <>
                    <strong>Platform</strong> Transfers
                  </>
                }
              >
                Latest indexed transactions in each direction. Deposits increase
                the Core credit pool; withdrawals pay DASH back to Core. Amounts
                exclude change and withdrawal fees. These are not 24-hour
                totals.
              </InfoPopover>
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              {state(
                unlocks.isPending,
                unlocks.isError,
                !withdrawals.length,
                () => void unlocks.refetch(),
              ) || (
                <ul
                  aria-label="Latest AssetUnlock withdrawals"
                  className="space-y-2 rounded-xl"
                >
                  {withdrawals.map((transaction) => (
                    <TransferRow
                      key={transaction.hash}
                      transaction={transaction}
                    />
                  ))}
                </ul>
              )}
            </div>
            <div className="min-w-0">
              {state(
                locks.isPending,
                locks.isError,
                !deposits.length,
                () => void locks.refetch(),
              ) || (
                <ul
                  aria-label="Latest AssetLock deposits"
                  className="space-y-2 rounded-xl"
                >
                  {deposits.map((transaction, index) => (
                    <TransferRow
                      key={transaction.hash}
                      transaction={transaction}
                      detail={details[index]?.data}
                      loading={details[index]?.isPending}
                      error={details[index]?.isError}
                      retry={() => void details[index]?.refetch()}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
      {assetStats.isError && (
        <button
          type="button"
          onClick={() => void assetStats.refetch()}
          className="text-sm text-destructive underline"
        >
          Retry transfer statistics
        </button>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,716fr)_minmax(0,580fr)]">
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <AssetMetric icon="credit-pool" label="Core credit pool balance">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className="whitespace-nowrap text-xl font-extrabold leading-[1.2] text-accent sm:text-2xl"
                title={
                  balance == null
                    ? undefined
                    : `${metricNumber(balance, 8)} DASH`
                }
              >
                {blocks.isPending
                  ? "…"
                  : balance == null
                    ? "—"
                    : formatCompact(balance)}{" "}
                <span className="font-medium">DASH</span>
              </p>
              <CreditsEquivalentBadge
                duffs={
                  balance == null ? null : Math.round(balance * 100_000_000)
                }
                loading={blocks.isPending}
              />
            </div>
          </AssetMetric>
          <AssetMetric icon="asset-lock" label="Deposited amount in 24 Hours">
            <div className="flex flex-wrap items-center gap-2">
              <p className="whitespace-nowrap text-2xl font-extrabold leading-[1.2] text-accent">
                {assetStats.isPending ? "…" : metricDuffs(locked?.amount)}{" "}
                <span className="font-medium">DASH</span>
              </p>
              <CreditsEquivalentBadge
                duffs={locked?.amount}
                loading={assetStats.isPending}
              />
              {assetStats.isSuccess && locked?.amount == null && (
                <MissingApiData
                  label="Unavailable"
                  inline
                  className="whitespace-nowrap"
                  description="The selected network has not returned the 24-hour AssetLock amount."
                />
              )}
            </div>
          </AssetMetric>
          <AssetMetric icon="asset-unlock" label="Withdrawn amount in 24 Hours">
            <div className="flex flex-wrap items-center gap-2">
              <p className="whitespace-nowrap text-2xl font-extrabold leading-[1.2] text-accent">
                {assetStats.isPending ? "…" : metricDuffs(unlocked?.amount)}{" "}
                <span className="font-medium">DASH</span>
              </p>
              <CreditsEquivalentBadge
                duffs={unlocked?.amount}
                loading={assetStats.isPending}
              />
              {assetStats.isSuccess && unlocked?.amount == null && (
                <MissingApiData
                  label="Unavailable"
                  inline
                  className="whitespace-nowrap"
                  description="The selected network has not returned the 24-hour AssetUnlock amount."
                />
              )}
            </div>
          </AssetMetric>
          <AssetMetric
            icon="asset-activity"
            label="AssetLocks/AssetUnlocks in 24 Hours"
          >
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap text-2xl font-extrabold leading-[1.2] text-accent">
                {assetStats.isPending
                  ? "…"
                  : metricNumber(
                      locked?.count != null && unlocked?.count != null
                        ? locked.count + unlocked.count
                        : null,
                      0,
                    )}{" "}
                <span className="font-medium">Txs</span>
              </p>
              {assetStats.isSuccess &&
                (locked?.count == null || unlocked?.count == null) && (
                  <MissingApiData
                    label="Unavailable"
                    inline
                    className="whitespace-nowrap"
                    description="The API does not expose a 24-hour breakdown for AssetLock and AssetUnlock transaction counts. This is a count, not a DASH or credit amount."
                  />
                )}
            </div>
          </AssetMetric>
        </div>
        <div className="flex min-h-[256px] min-w-0 flex-col gap-4 rounded-3xl dash-home-panel p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="dash-body">
                <InfoPopover
                  label="About the credit pool"
                  trigger="Core credit pool history"
                >
                  Core credit pool balance in DASH, as reported by indexed
                  blocks. This is not a direct count of issued Platform credits.
                  The chart shows the last indexed balance in each daily
                  interval.
                </InfoPopover>
              </h3>
              <p className="mt-2 text-[32px] leading-tight">
                <strong>
                  {blocks.isPending ? "…" : metricNumber(balance)}
                </strong>{" "}
                <span className="text-base">DASH</span>
              </p>
            </div>
          </div>
          {blocks.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Credit pool unavailable.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void blocks.refetch()}
              >
                Try again
              </button>
            </p>
          ) : blocks.isPending ? (
            <p className="text-sm text-muted-foreground">
              Loading credit pool…
            </p>
          ) : balance == null ? (
            <p className="text-sm text-muted-foreground">
              No credit pool balance available in the latest indexed block.
            </p>
          ) : null}
          <div className="flex min-h-[88px] flex-1 flex-col justify-center">
            <ChainHistoryChart
              data={poolHistory.data}
              metric="creditPoolBalance"
              label="Core credit pool history · 30 days"
              formatValue={(value) => `${metricNumber(value)} DASH`}
              loading={poolHistory.isPending}
              error={poolHistory.isError}
              onRetry={() => void poolHistory.refetch()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
