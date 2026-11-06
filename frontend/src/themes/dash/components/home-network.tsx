import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ApiPeer, allPeersQueryOptions } from "@/lib/api/peers";
import { appStore, type Network } from "@/lib/store";
import {
  snapshotChange,
  useHomeChainHistory,
} from "@/themes/dash/lib/home-history";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  type PeerSelection,
  peerCountries,
  peerLocation,
  peerNetworkData,
  selectedPeerIds,
} from "@/themes/dash/lib/network-metrics";
import { HomeIcon } from "./home-icon";
import { HomeMapSurface } from "./home-map-surface";
import { HomeNodeMap } from "./home-masternode-map";
import { HomeNetworkUpgrades } from "./home-network-upgrades";
import { MissingApiData } from "./missing-api-data";
import { PeerDistributionCard } from "./peer-distribution-card";

export function HomeNetwork() {
  const network = useStore(appStore, (state) => state.network);
  return <NetworkSection key={network} network={network} />;
}

const peerId = (peer: ApiPeer) => peer.address;

function NetworkSection({ network }: { network: Network }) {
  const snapshots = useHomeChainHistory(network, 2, 48);
  const peerChange = snapshotChange(snapshots.data, "peers", 1);
  const titleId = useId();
  const mapRef = useRef<HTMLDivElement>(null);

  const [selection, setSelection] = useState<PeerSelection | null>(null);
  const selectPeers = (next: PeerSelection) => {
    setSelection((current) =>
      current?.facet === next.facet && current.value === next.value
        ? null
        : next,
    );
  };
  const peers = useQuery(allPeersQueryOptions({ network, available: true }));
  const data = useMemo(() => peerNetworkData(peers.data ?? []), [peers.data]);
  const selectedIds = useMemo(
    () => selectedPeerIds(data, selection),
    [data, selection],
  );
  const selectionLabel =
    selection?.value === null
      ? "Other"
      : selection
        ? (data.entries[selection.facet].find(
            (entry) => entry.value === selection.value,
          )?.label ?? selection.value)
        : null;
  const selectedCountry =
    selection?.facet === "country" ? selection.value : null;
  const filterValue =
    selectedCountry !== null
      ? `country:${selectedCountry}`
      : selection
        ? "chart-selection"
        : "all";
  const status = peers.isPending
    ? "Loading peers…"
    : peers.isError && !peers.data
      ? "Peers unavailable"
      : null;
  return (
    <section
      aria-labelledby={titleId}
      className="relative isolate flex flex-col gap-8 py-4 sm:py-8 lg:gap-16"
    >
      <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,442px)_minmax(0,1fr)] xl:gap-32">
        <div className="min-w-0">
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h2
            id={titleId}
            className="dash-heading-page mt-2 sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">Network</span> Stats
          </h2>
          <p className="dash-body mt-3 text-foreground/50">
            Explore peers observed by the Dash network crawler, their locations,
            client versions, and user agents.
          </p>
          <Link
            to="/peers"
            className="dash-home-action dash-home-action-subtle mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2 text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore Network
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
              <HomeIcon name="explore" />
            </span>
          </Link>
        </div>
        <div
          data-map-panel
          className="relative isolate min-w-0 rounded-3xl border border-border p-4 sm:p-6"
        >
          <HomeMapSurface mapRef={mapRef} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="dash-body">Peers Map</h3>
            <div className="w-full min-w-0 sm:w-48 sm:shrink-0">
              <Select
                value={filterValue}
                disabled={!!status}
                onValueChange={(value) => {
                  if (value === "all") setSelection(null);
                  else if (value.startsWith("country:")) {
                    setSelection({ facet: "country", value: value.slice(8) });
                  }
                }}
              >
                <SelectTrigger
                  aria-label="Filter peers"
                  className="w-full min-w-0 rounded-xl border-border bg-card px-3 data-[size=default]:h-10 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="max-h-[min(18rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] rounded-xl bg-card"
                >
                  <SelectItem value="all">All peers</SelectItem>
                  {selection && selectedCountry === null && (
                    <SelectItem value="chart-selection">
                      {selection.facet === "version"
                        ? "Version"
                        : selection.facet === "client"
                          ? "Client"
                          : "Countries"}
                      : {selectionLabel}
                    </SelectItem>
                  )}
                  {selectedCountry !== null &&
                    !data.countryGroups.some(
                      (country) => country.code === selectedCountry,
                    ) && (
                      <SelectItem value={`country:${selectedCountry}`}>
                        {selectionLabel}
                      </SelectItem>
                    )}
                  {data.countryGroups.map((country) => (
                    <SelectItem
                      key={country.code}
                      value={`country:${country.code}`}
                      textValue={country.name}
                      className="*:last:min-w-0 *:last:flex-1"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {country.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {metricNumber(country.nodes.length, 0)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-[32px] font-extrabold leading-tight">
              {peers.data ? metricNumber(data.nodes.length, 0) : "—"}{" "}
              <span className="text-base font-medium">Reachable Peers</span>
            </p>
            {peerChange != null ? (
              <span
                className="text-sm text-accent"
                title="Change between reachable-peer snapshots 24 hours apart, independent of map filters"
              >
                24H {peerChange > 0 ? "+" : ""}
                {metricNumber(peerChange)}%
              </span>
            ) : (
              <MissingApiData
                inline
                description="The API has not yet collected reachable-peer snapshots covering a full 24 hours."
              />
            )}
          </div>
          <div
            data-grid-map
            ref={mapRef}
            className="relative mt-6 h-[207px] overflow-hidden rounded-3xl"
          >
            {status ? (
              <output className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {status}
              </output>
            ) : data.located ? (
              <HomeNodeMap
                key={network}
                nodes={data.nodes}
                label="peers"
                getId={peerId}
                getLocation={peerLocation}
                getCountries={peerCountries}
                selectedHashes={selectedIds}
                onSelectCountry={(code) =>
                  selectPeers({ facet: "country", value: code })
                }
              />
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No peer locations available
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        {peers.isError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {peers.data
              ? "Could not refresh peers. Showing the last loaded snapshot."
              : "Could not load peers."}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void peers.refetch()}
            >
              Try again
            </button>
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          <PeerDistributionCard
            title="Dash Core Versions"
            facet="version"
            slices={data.distributions.version}
            status={status}
            selectedIds={selectedIds}
            selection={selection}
            onSelect={selectPeers}
          />
          <PeerDistributionCard
            title="Countries Pie Chart"
            facet="country"
            slices={data.distributions.country}
            status={status}
            selectedIds={selectedIds}
            selection={selection}
            onSelect={selectPeers}
          />
          <PeerDistributionCard
            title="User Agent Pie Chart"
            facet="client"
            slices={data.distributions.client}
            status={status}
            selectedIds={selectedIds}
            selection={selection}
            onSelect={selectPeers}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Successfully contacted peers in the latest crawl. Versions refer to
          Dash Core.
        </p>
      </div>
      <HomeNetworkUpgrades network={network} />
    </section>
  );
}
