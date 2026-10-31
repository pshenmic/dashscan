import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useId } from "react";
import { RelativeTime } from "@/components/relative-time";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  transactionQueryOptions,
  transactionsQueryOptions,
} from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import { homeBlocksQueryOptions } from "@/lib/home";
import { appStore } from "@/lib/store";
import { assetTransferAmount } from "@/themes/dash/lib/asset-metrics";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";
import { MissingApiData } from "./missing-api-data";

function AssetInfo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="size-6 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
        >
          <img
            src="/icons/home/info.svg"
            alt=""
            width={24}
            height={24}
            className="size-6 dark:invert"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[calc(100vw-2rem)] text-sm">
        {children}
      </PopoverContent>
    </Popover>
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
    <li className="flex min-h-[66px] min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-4 text-sm shadow-card">
      <span className="shrink-0 text-foreground/64">
        {transaction.timestamp ? (
          <RelativeTime timestamp={transaction.timestamp} />
        ) : (
          "Pending"
        )}
      </span>
      <Link
        to="/transactions/$hash"
        params={{ hash: transaction.hash }}
        title={transaction.hash}
        className={`rounded-full border px-2 py-1 text-xs hover:underline focus-visible:outline-2 focus-visible:outline-ring ${deposit ? "border-action-subtle bg-action-subtle text-brand" : "border-border bg-foreground/12"}`}
      >
        {deposit ? "Deposit" : "Withdrawal"}
      </Link>
      <span
        className="min-w-0 break-words text-right font-extrabold"
        title={
          deposit
            ? "Locked amount from the AssetLock payload, excluding change"
            : "DASH paid to Core outputs, excluding the withdrawal fee"
        }
      >
        {loading
          ? "…"
          : amount == null
            ? "—"
            : `${deposit ? "+" : "−"} ${transactionAmount(amount)}`}
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
    <div className="flex min-h-[120px] min-w-0 flex-col justify-center gap-3 rounded-3xl bg-foreground/3 px-6 py-4">
      <img
        src={`/icons/home/${icon}.svg`}
        alt=""
        width={24}
        height={24}
        className="size-6"
      />
      <h3 className="dash-body-compact text-foreground/50">{label}</h3>
      {children}
    </div>
  );
}

export function HomeAssets() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const blocks = useQuery(homeBlocksQueryOptions(network));
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
      className="flex flex-col gap-10 rounded-3xl bg-card p-4 sm:p-8 lg:gap-16 lg:rounded-[48px]"
    >
      <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,608fr)_minmax(0,672fr)]">
        <div className="min-w-0">
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h2
            id={titleId}
            className="dash-heading-page mt-2 break-words sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">AssetLock/Unlock</span>{" "}
            Stats
          </h2>
          <p className="dash-body mt-3 text-foreground/50">
            Track AssetLock and AssetUnlock transactions - the special transfers
            that move DASH between the base chain and Dash Platform.
          </p>
        </div>
        <div className="relative isolate min-w-0 xl:min-h-[290px]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 -z-10 h-[254px] rounded-3xl bg-card shadow-card sm:inset-x-[30px]"
          />
          <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-6 sm:mx-[30px]">
            <h3 className="dash-heading-section">
              <strong>L2</strong> Transfers
            </h3>
            <AssetInfo label="About Platform transfers">
              Latest indexed transactions in each direction. Deposits increase
              the Core credit pool; withdrawals pay DASH back to Core. Amounts
              exclude change and withdrawal fees. These are not 24-hour totals.
            </AssetInfo>
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
                  className="space-y-2"
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
                  className="space-y-2"
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,716fr)_minmax(0,580fr)]">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <AssetMetric icon="credit-pool" label="Total credits locked in L2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="dash-metric break-words text-brand">
                {blocks.isPending ? "…" : metricNumber(balance)}{" "}
                <span className="font-medium">Dash</span>
              </p>
              <span className="dash-label-small rounded-lg bg-secondary px-2 py-1 text-muted-foreground">
                Core credit pool
              </span>
            </div>
          </AssetMetric>
          <AssetMetric icon="asset-lock" label="Deposited amount in 24 Hours">
            <div className="flex flex-wrap items-center gap-3">
              <p className="dash-metric text-brand">
                — <span className="font-medium">Dash</span>
              </p>
              <MissingApiData
                inline
                description="The API provides individual AssetLock transactions but no complete 24-hour locked-amount aggregate. Summing the latest three transactions would be misleading."
              />
            </div>
          </AssetMetric>
          <AssetMetric icon="asset-unlock" label="Withdrawn amount in 24 Hours">
            <div className="flex flex-wrap items-center gap-3">
              <p className="dash-metric text-brand">
                — <span className="font-medium">Dash</span>
              </p>
              <MissingApiData
                inline
                description="A complete 24-hour AssetUnlock amount aggregate is not available. Latest withdrawals are not a daily total."
              />
            </div>
          </AssetMetric>
          <AssetMetric
            icon="asset-activity"
            label="AssetLocks/AssetUnlocks in 24 Hours"
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="dash-metric text-brand">
                — <span className="font-medium">Txs</span>
              </p>
              <MissingApiData
                inline
                description="The API does not expose a 24-hour breakdown for AssetLock and AssetUnlock transaction counts. This is a count, not a DASH or credit amount."
              />
            </div>
          </AssetMetric>
        </div>
        <div className="flex min-h-[256px] min-w-0 flex-col gap-4 rounded-3xl bg-foreground/3 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="dash-body">Credits locked in platform</h3>
              <p className="mt-2 text-[32px] leading-tight">
                <strong>
                  {blocks.isPending ? "…" : metricNumber(balance)}
                </strong>{" "}
                <span className="text-base">Dash</span>
              </p>
            </div>
            <AssetInfo label="About the credit pool">
              Core credit pool balance in DASH, as reported by indexed blocks.
              This is not a direct count of issued Platform credits. Multi-day
              balance history is not yet available through the API.
            </AssetInfo>
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
            <MissingApiData description="A multi-day credit pool history and its percentage change are not exposed by the current API." />
          </div>
        </div>
      </div>
    </section>
  );
}
