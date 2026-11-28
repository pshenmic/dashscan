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
import { MasternodesOverview } from "@/themes/dash/components/masternodes-overview";
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

  const collateral =
    distribution &&
    distribution.regular + distribution.evo === distribution.total
      ? distribution.regular * 1_000 + distribution.evo * 4_000
      : undefined;

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
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
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex min-w-0 flex-col gap-5 xl:row-span-2 xl:grid xl:grid-rows-subgrid">
          <h1 className="dash-heading-page sm:dash-heading-hero">
            <span className="font-extrabold text-brand">Masternodes</span> Stats
          </h1>
          <div className="relative pt-3">
            <dl className="absolute left-1/2 top-3 z-10 flex w-max max-w-full -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl dash-home-panel px-3 py-1 text-sm">
              <dt className="text-muted-foreground">
                <InfoPopover
                  label="About masternode collateral"
                  trigger="Collateral"
                >
                  Registered nodes across all statuses: 1 000 DASH per regular
                  masternode and 4 000 DASH per Evonode.
                </InfoPopover>
              </dt>
              <dd className="whitespace-nowrap font-semibold tabular-nums">
                {count(collateral)} DASH
              </dd>
            </dl>
            <MasternodesOverview network={network} />
          </div>
        </div>
        <section
          aria-label="Masternode map and network statistics"
          className="relative isolate flex min-w-0 flex-col gap-2 xl:row-span-2 xl:grid xl:grid-rows-subgrid"
        >
          <div className="grid content-center gap-2">
            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 whitespace-nowrap text-xs xl:relative">
                <span className="rounded-full dash-home-panel px-3 py-2 text-muted-foreground">
                  Banned{" "}
                  <span className="ml-2 font-semibold text-foreground tabular-nums">
                    {count(banned)}
                  </span>
                </span>
                <span className="rounded-full dash-home-panel px-3 py-2 text-muted-foreground">
                  Enabled{" "}
                  <span className="ml-2 font-semibold text-foreground tabular-nums">
                    {count(enabled)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-2 inline-block size-1.5 rounded-full bg-positive-brand"
                  />
                </span>
                <dl className="pointer-events-none absolute left-0 top-full mt-2 z-10 flex flex-col items-start gap-2 text-xs">
                  {[
                    {
                      label: "Masternodes",
                      value: distribution?.regular,
                    },
                    { label: "Evonodes", value: distribution?.evo },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-baseline gap-2 rounded-full dash-home-panel px-3 py-2"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-semibold tabular-nums">
                        {count(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
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
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[2/1] overflow-hidden rounded-2xl xl:absolute xl:inset-0 xl:aspect-auto xl:[container-type:size] xl:[&>fieldset]:w-[min(100%,calc(220cqh+2rem))]">
              {nodes ? (
                <Suspense fallback={<SkeletonBar className="h-full w-full" />}>
                  <MasternodeMap
                    fitHeight
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
          </div>
        </section>
      </div>
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
