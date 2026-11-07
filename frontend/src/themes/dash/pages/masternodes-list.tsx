import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allMasternodesQueryOptions } from "@/lib/api/masternodes";
import type { PageSize } from "@/lib/pagination";
import { appStore, type Network } from "@/lib/store";
import { InfoPopover } from "@/themes/dash/components/info-popover";
import {
  MasternodeQuorums,
  MasternodesOverview,
} from "@/themes/dash/components/masternodes-overview";
import {
  type MasternodeFilters,
  MasternodesTable,
} from "@/themes/dash/components/masternodes-table";
import { SkeletonBar } from "@/themes/dash/components/skeleton";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  masternodeCountries,
  masternodeCountry,
  masternodeDistribution,
} from "@/themes/dash/lib/masternode-metrics";

const MasternodeMap = lazy(() =>
  import("@/themes/dash/components/home-masternode-map").then((module) => ({
    default: module.HomeMasternodeMap,
  })),
);
const emptyFilters: MasternodeFilters = {
  ip: "",
  hash: undefined,
  type: "all",
  status: "all",
};

export default function MasternodesListPage(props: {
  page: number;
  limit: PageSize;
}) {
  const network = useStore(appStore, (state) => state.network);
  return <MasternodesList key={network} network={network} {...props} />;
}

function MasternodesList({
  network,
  page,
  limit,
}: {
  network: Network;
  page: number;
  limit: PageSize;
}) {
  const navigate = useNavigate({ from: "/masternodes/" });
  const query = useQuery({
    ...allMasternodesQueryOptions({ network }),
    refetchInterval: 60_000,
  });
  const [country, setCountry] = useState("all");
  const [group, setGroup] = useState<Set<string> | null>(null);
  const [filters, setFilters] = useState<MasternodeFilters>(emptyFilters);
  const nodes = query.data;
  const distribution = useMemo(() => masternodeDistribution(nodes), [nodes]);
  const countries = useMemo(() => masternodeCountries(nodes), [nodes]);
  const filtered = useMemo(
    () =>
      (nodes ?? []).filter(
        (node) =>
          (country === "all" || masternodeCountry(node) === country) &&
          (!group || group.has(node.proTxHash)) &&
          (!filters.hash || node.proTxHash.toLowerCase() === filters.hash) &&
          (!filters.ip ||
            node.address.toLowerCase().includes(filters.ip.toLowerCase())) &&
          (filters.type === "all" || node.type === filters.type) &&
          (filters.status === "all" || node.status === filters.status),
      ),
    [nodes, country, group, filters],
  );
  const hasFilters =
    country !== "all" ||
    group !== null ||
    filters.ip !== "" ||
    filters.hash !== undefined ||
    filters.type !== "all" ||
    filters.status !== "all";
  const selectedHashes = useMemo(
    () => (hasFilters ? new Set(filtered.map((node) => node.proTxHash)) : null),
    [hasFilters, filtered],
  );
  const enabled = nodes?.filter((node) => node.status === "ENABLED").length;
  const banned = nodes?.filter((node) => node.status === "POSE_BANNED").length;
  const resetPage = () => {
    if (page !== 1)
      void navigate({ search: { page: 1, limit }, resetScroll: false });
  };
  const selectCountry = (value: string) => {
    setCountry(value);
    setGroup(null);
    resetPage();
  };
  const selectGroup = (hashes: string[]) => {
    const selected = new Set(hashes);
    const codes = new Set(
      nodes
        ?.filter((node) => selected.has(node.proTxHash))
        .map(masternodeCountry),
    );
    setCountry(codes.size === 1 ? [...codes][0] : "all");
    setGroup(selected);
    setFilters(emptyFilters);
    resetPage();
  };
  const clear = () => {
    setCountry("all");
    setGroup(null);
    setFilters(emptyFilters);
    resetPage();
  };
  const count = (value: number | undefined) =>
    query.isPending ? (
      <SkeletonBar className="inline-block w-12" />
    ) : (
      metricNumber(value, 0)
    );

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="dash-heading-page">
          Masternodes <span className="text-muted-foreground">List</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-card px-3 py-2 text-muted-foreground">
            PoSe banned{" "}
            <span className="ml-2 font-semibold text-foreground tabular-nums">
              {count(banned)}
            </span>
          </span>
          <span className="rounded-full bg-card px-3 py-2 text-muted-foreground">
            Enabled{" "}
            <span className="ml-2 font-semibold text-foreground tabular-nums">
              {count(enabled)}
            </span>
            <span
              aria-hidden="true"
              className="ml-2 inline-block size-1.5 rounded-full bg-positive-brand"
            />
          </span>
        </div>
      </div>
      {query.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-card p-4 text-sm"
        >
          <p>
            {nodes
              ? "Updates are unavailable. Showing the last loaded data."
              : "Could not load masternodes."}
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="text-accent underline"
          >
            Retry
          </button>
        </div>
      )}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Regular masternodes", value: distribution?.regular },
              { label: "Evonodes", value: distribution?.evo },
            ].map((item) => (
              <section
                key={item.label}
                className="min-w-0 rounded-3xl bg-card px-5 py-4 sm:px-6"
              >
                <h2 className="text-sm text-muted-foreground">{item.label}</h2>
                <p className="mt-2 text-2xl font-extrabold text-brand tabular-nums">
                  {count(item.value)}{" "}
                  <span className="text-sm font-medium">Nodes</span>
                </p>
              </section>
            ))}
          </div>
          <section
            aria-label="Masternodes map"
            className="min-w-0 flex-1 rounded-3xl bg-card p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium">Masternodes Map</h2>
                <InfoPopover label="About masternode locations">
                  Locations are estimated from IP addresses. Nodes without
                  coordinates remain in the table. Map and table use the same
                  filters.
                </InfoPopover>
              </div>
              <Select
                value={country}
                onValueChange={selectCountry}
                disabled={!nodes}
              >
                <SelectTrigger
                  aria-label="Country"
                  className="w-48 max-w-full rounded-xl bg-card"
                >
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-72 w-[var(--radix-select-trigger-width)] rounded-xl"
                >
                  <SelectItem value="all">All countries</SelectItem>
                  {countries.map((item) => (
                    <SelectItem
                      key={item.code}
                      value={item.code}
                      textValue={item.name}
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="ml-2 text-muted-foreground tabular-nums">
                        {metricNumber(item.nodes.length, 0)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[32px] font-extrabold tabular-nums">
                {count(nodes ? filtered.length : undefined)}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  {hasFilters
                    ? `of ${metricNumber(nodes?.length, 0)} nodes`
                    : "Nodes Total"}
                </span>
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-lg px-2 py-1 text-xs text-accent hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="relative mt-4 h-[240px] overflow-hidden rounded-3xl bg-secondary/50">
              {nodes ? (
                <Suspense fallback={<SkeletonBar className="h-full w-full" />}>
                  <MasternodeMap
                    nodes={nodes}
                    selectedHashes={selectedHashes}
                    onSelect={selectGroup}
                    onSelectCountry={selectCountry}
                  />
                </Suspense>
              ) : query.isPending ? (
                <SkeletonBar className="h-full w-full" />
              ) : (
                <p className="p-6 text-sm text-muted-foreground">
                  Map unavailable.
                </p>
              )}
            </div>
          </section>
        </div>
        <MasternodesOverview
          network={network}
          total={nodes?.length}
          loading={query.isPending}
        />
      </div>
      <MasternodeQuorums />
      <MasternodesTable
        nodes={filtered}
        allNodes={nodes ?? []}
        page={page}
        limit={limit}
        fetching={query.isFetching}
        failed={!nodes && query.isError}
        filters={filters}
        selectionKey={`${country}:${group ? [...group].join(",") : ""}`}
        onFiltersChange={(value) => {
          setFilters(value);
          setGroup(null);
          resetPage();
        }}
      />
    </main>
  );
}
