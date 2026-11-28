import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { AddressNotFoundError, addressQueryOptions } from "@/lib/api/addresses";
import type { PageSize } from "@/lib/pagination";
import { appStore } from "@/lib/store";
import { AddressBalanceChart } from "@/themes/dash/components/address-balance-chart";
import { AddressOverview } from "@/themes/dash/components/address-overview";
import { AddressTransactionsTable } from "@/themes/dash/components/address-transactions-table";
import { CopyButton } from "@/themes/dash/components/copy-button";
import { PageStatus } from "@/themes/dash/components/page-status";
import { SkeletonBar } from "@/themes/dash/components/skeleton";

export default function AddressDetailPage({
  address,
  page,
  limit,
}: {
  address: string;
  page: number;
  limit: PageSize;
}) {
  const network = useStore(appStore, (state) => state.network);
  const query = useQuery({
    ...addressQueryOptions({ network, address }),
    refetchInterval: 30_000,
    retry: (count, error) =>
      !(error instanceof AddressNotFoundError) && count < 2,
  });
  const detail = query.data;
  if (query.isPending) return <AddressSkeleton />;
  if (!detail) {
    if (query.error instanceof AddressNotFoundError)
      return <PageStatus message="Address not found." />;
    return (
      <main className="mx-auto max-w-[1440px] px-4 py-16 text-center">
        <p role="alert">Could not load this address.</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 text-accent underline"
        >
          Retry
        </button>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16">
      <header className="min-w-0 space-y-3">
        <h1 className="dash-heading-page sm:dash-heading-hero">
          <span className="font-extrabold text-brand">Address</span>
        </h1>
        <div className="group flex min-w-0 items-center gap-2">
          <span className="min-w-0 break-all font-mono text-sm leading-6 sm:text-base">
            {address}
          </span>
          <CopyButton value={address} label="Copy address" />
        </div>
      </header>
      {query.isError && (
        <output className="block text-sm text-muted-foreground">
          Address updates are unavailable. Showing the last loaded data.
        </output>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <AddressOverview detail={detail} />
        <AddressBalanceChart
          key={`${network}:${address}`}
          detail={detail}
          network={network}
        />
      </div>
      <AddressTransactionsTable
        key={`${network}:${address}`}
        address={address}
        network={network}
        page={page}
        limit={limit}
        total={Number(detail.txCount)}
      />
    </main>
  );
}

function AddressSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading address"
      className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16"
    >
      <output className="sr-only">Loading address…</output>
      <div className="space-y-3">
        <SkeletonBar className="h-[42px] w-40 sm:h-[60px] sm:w-56" />
        <SkeletonBar className="h-6 w-full max-w-md" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="isolate grid min-w-0 gap-4 sm:gap-0">
          <div className="rounded-3xl border border-border bg-card p-4 sm:row-start-2 sm:mr-6 sm:-mt-4 sm:px-5 sm:py-8">
            <SkeletonBar className="h-6 w-24" />
            <SkeletonBar className="mt-1 h-9 w-64 max-w-full" />
            <div className="mt-3 grid gap-2 border-t border-border pt-3">
              <SkeletonBar className="h-5 w-full" />
              <SkeletonBar className="h-5 w-full" />
            </div>
          </div>
          {["first", "last"].map((field) => (
            <div
              key={field}
              className={`relative z-10 min-w-0 space-y-2 rounded-2xl border border-border bg-card p-4 sm:w-[85%] ${field === "first" ? "sm:row-start-1 sm:justify-self-end" : "sm:row-start-3 sm:-mt-4 sm:justify-self-center"}`}
            >
              <SkeletonBar className="w-32" />
              <SkeletonBar className="w-full" />
              <SkeletonBar className="w-56 max-w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-5 lg:self-center">
          <SkeletonBar className="h-8 w-56 max-w-full" />
          <SkeletonBar className="h-48 w-full" />
        </div>
      </div>
      <div className="space-y-4 rounded-3xl bg-card p-6">
        <h2 className="text-xl font-extrabold">Transactions</h2>
        {["header", "first", "second", "third", "fourth", "fifth"].map(
          (row) => (
            <SkeletonBar key={row} className="h-11 w-full" />
          ),
        )}
      </div>
    </main>
  );
}
