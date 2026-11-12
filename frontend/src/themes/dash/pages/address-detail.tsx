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
      <div className="group flex min-w-0 items-center gap-3">
        <h1 className="dash-heading-page min-w-0 break-words">
          <span className="text-muted-foreground">Address </span>
          <span className="break-all">{address}</span>
        </h1>
        <CopyButton value={address} />
      </div>
      {query.isError && (
        <output className="block text-sm text-muted-foreground">
          Address updates are unavailable. Showing the last loaded data.
        </output>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,600fr)_minmax(0,760fr)]">
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
      <SkeletonBar className="h-10 w-full max-w-3xl" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,600fr)_minmax(0,760fr)]">
        <div className="space-y-6 rounded-3xl bg-card p-6">
          <div className="grid grid-cols-2 gap-4">
            {["balance", "received", "transactions", "sent"].map((field) => (
              <SkeletonBar key={field} className="h-24 w-full rounded-3xl" />
            ))}
          </div>
          {["first", "last"].map((field) => (
            <div key={field} className="space-y-2">
              <SkeletonBar className="w-32" />
              <SkeletonBar className="w-full" />
              <SkeletonBar className="w-56" />
            </div>
          ))}
        </div>
        <div className="space-y-6 rounded-3xl bg-card p-6">
          <SkeletonBar className="h-16 w-56" />
          <SkeletonBar className="h-64 w-full" />
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
