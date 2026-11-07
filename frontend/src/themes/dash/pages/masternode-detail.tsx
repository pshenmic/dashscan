import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import { appStore, type Network } from "@/lib/store";
import { MasternodeActivity } from "@/themes/dash/components/masternode-activity";
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
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[34px] font-medium tracking-tight">
          Masternode <span className="text-muted-foreground">Info</span>
        </h1>
      </div>
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
        <div aria-busy="true" className="grid gap-6 lg:grid-cols-2">
          <output className="sr-only">Loading masternode…</output>
          <div className="space-y-6 rounded-3xl bg-card p-6">
            <SkeletonBar className="h-16 w-full" />
            <SkeletonBar className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <SkeletonBar className="h-72 w-full" />
            <SkeletonBar className="h-72 w-full" />
          </div>
        </div>
      ) : node ? (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <MasternodeOverview node={node} />
            <MasternodeActivity network={network} node={node} />
          </div>
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
