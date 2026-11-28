import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import { appStore, type Network } from "@/lib/store";
import { MasternodeOverview } from "@/themes/dash/components/masternode-overview";
import { MasternodeTransactions } from "@/themes/dash/components/masternode-transactions";
import { SkeletonBar } from "@/themes/dash/components/skeleton";

export default function MasternodeDetailPage({ hash }: { hash: string }) {
  const network = useStore(appStore, (state) => state.network);
  return (
    <MasternodeDetail
      key={`${network}:${hash}`}
      network={network}
      hash={hash}
    />
  );
}

function MasternodeDetail({
  network,
  hash,
}: {
  network: Network;
  hash: string;
}) {
  const { page, limit, view } = useSearch({ from: "/masternodes/$hash" });
  const query = useQuery({
    ...masternodeQueryOptions({ network, hash }),
    refetchInterval: 60_000,
  });
  const node = query.data;
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16 [&_a.dash-data-mono]:text-accent [&_a.dash-data-mono:hover]:underline">
      <h1 className="dash-heading-page flex min-w-0 flex-col gap-2 sm:dash-heading-hero sm:flex-row sm:items-baseline sm:gap-4">
        <span className="shrink-0 font-extrabold text-brand">Masternode</span>
        {node && (
          <span title={node.proTxHash} className="min-w-0 truncate font-mono">
            {node.proTxHash}
          </span>
        )}
      </h1>
      {query.isError && (
        <div role="alert" className="rounded-2xl bg-card p-5 text-sm">
          <p>
            {node
              ? "Could not refresh masternode. Showing previous data."
              : "Could not load masternode."}
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-2 text-accent underline"
          >
            Try again
          </button>
        </div>
      )}
      {query.isPending ? (
        <div aria-busy="true" className="grid gap-4 xl:grid-cols-2">
          <output className="sr-only">Loading masternode…</output>
          <SkeletonBar className="h-48 w-full rounded-3xl" />
          <SkeletonBar className="h-48 w-full rounded-3xl" />
          <SkeletonBar className="h-64 w-full rounded-3xl" />
          <SkeletonBar className="h-64 w-full rounded-3xl" />
        </div>
      ) : node ? (
        <>
          <MasternodeOverview node={node} network={network} />
          <MasternodeTransactions
            network={network}
            hash={node.proTxHash}
            page={page}
            limit={limit}
            view={view}
          />
        </>
      ) : (
        !query.isError && (
          <section className="rounded-3xl bg-card p-8 text-center">
            <h2 className="text-xl font-extrabold">Masternode not found</h2>
            <Link
              to="/masternodes"
              className="mt-4 inline-block text-accent hover:underline"
            >
              Explore masternodes
            </Link>
          </section>
        )
      )}
    </main>
  );
}
