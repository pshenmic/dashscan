import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useCallback, useMemo, useState } from "react";
import { countryName } from "@/components/explorer/geo/iso-codes";
import { PeersTable } from "@/themes/dash/components/peers-table";
import { Pagination } from "@/themes/dash/components/pagination";
import {
  EMPTY_PEER_FILTERS,
  type PeerFilters,
  PeersFilterBar,
} from "@/components/explorer/peers-filter-bar";
import { HomeNodeMap } from "@/themes/dash/components/home-masternode-map";
import { peerCountries, peerLocation } from "@/themes/dash/lib/network-metrics";
import {
  type ApiPeer,
  allPeersQueryOptions,
  derivePeerUserAgents,
  peerUserAgentsQueryOptions,
} from "@/lib/api/peers";
import { formatNumber } from "@/lib/format";
import { appStore } from "@/lib/store";

const PAGINATION_PAGE_SIZE = 10;

const EMPTY_PEERS: ApiPeer[] = [];
const peerId = (peer: ApiPeer) => peer.address;

function searchHaystack(peer: ApiPeer): string {
  return [
    peer.address,
    peer.userAgent ?? "",
    peer.geo?.city ?? "",
    peer.geo ? countryName(peer.geo.countryCode) : "",
  ]
    .join(" ")
    .toLowerCase();
}

export default function PeersListPage() {
  const network = useStore(appStore, (state) => state.network);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE);
  const [filters, setFilters] = useState<PeerFilters>(EMPTY_PEER_FILTERS);

  const { data: allPeers, isFetching } = useQuery(
    allPeersQueryOptions({ network }),
  );
  const { data: apiUserAgents } = useQuery(
    peerUserAgentsQueryOptions({ network }),
  );

  const peers = allPeers ?? EMPTY_PEERS;
  const derivedUserAgents = useMemo(() => derivePeerUserAgents(peers), [peers]);
  const userAgents =
    apiUserAgents && apiUserAgents.length > 0
      ? apiUserAgents
      : derivedUserAgents;

  const stats = useMemo(() => {
    const available = peers.filter((p) => p.available).length;
    return {
      total: peers.length,
      available,
      unavailable: peers.length - available,
    };
  }, [peers]);

  const searchable = useMemo(
    () => peers.map((peer) => ({ peer, haystack: searchHaystack(peer) })),
    [peers],
  );

  const mapPeers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: ApiPeer[] = [];
    for (const { peer, haystack } of searchable) {
      if (filters.status === "available" && !peer.available) continue;
      if (filters.status === "unavailable" && peer.available) continue;
      if (filters.userAgent && peer.userAgent !== filters.userAgent) continue;
      if (filters.ip && peer.host !== filters.ip) continue;
      if (q && !haystack.includes(q)) continue;
      out.push(peer);
    }
    return out;
  }, [searchable, search, filters]);

  const countries = useMemo(() => peerCountries(mapPeers), [mapPeers]);
  const filtered = filters.country
    ? (countries.find(({ code }) => code === filters.country)?.nodes ??
      EMPTY_PEERS)
    : mapPeers;
  const selectedIds = useMemo(
    () => (filters.country ? new Set(filtered.map(peerId)) : null),
    [filtered, filters.country],
  );

  const total = filtered.length;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const handleFiltersChange = useCallback((next: PeerFilters) => {
    setFilters(next);
    setPage(1);
  }, []);
  const handleCountryChange = useCallback((code: string | null) => {
    setFilters((current) => ({ ...current, country: code }));
    setPage(1);
  }, []);
  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_PEER_FILTERS);
    setSearch("");
    setPage(1);
  }, []);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="isolate flex flex-col gap-6">
        <header className="relative z-10 grid w-full max-w-56 grid-cols-1 gap-2">
          <h1 className="dash-heading-page mb-1 flex items-baseline gap-[0.25em] sm:dash-heading-hero">
            <span className="font-extrabold text-brand">Peers</span>{" "}
            <span className="tabular-nums">
              {allPeers ? formatNumber(stats.total) : "—"}
            </span>
          </h1>
          {(["available", "unavailable"] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filters.status === status}
              onClick={() =>
                handleFiltersChange({
                  ...filters,
                  status: filters.status === status ? "all" : status,
                })
              }
              className="flex h-9 w-full items-center justify-between rounded-xl border border-border bg-card px-3 text-sm shadow-xs hover:border-accent focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-accent aria-pressed:ring-1 aria-pressed:ring-accent"
            >
              {status === "available" ? "Available" : "Unavailable"}{" "}
              <span
                className={`rounded-full px-2 py-1 text-xs font-extrabold tabular-nums ${!allPeers ? "bg-secondary text-muted-foreground" : status === "available" ? "bg-positive-brand/12 text-success" : "bg-destructive/12 text-destructive"}`}
              >
                {allPeers ? formatNumber(stats[status]) : "—"}
              </span>
            </button>
          ))}
        </header>

        <section
          aria-label="Peer locations"
          className="relative overflow-x-clip overflow-y-visible"
        >
          <div className="relative h-[207px]">
            <div className="absolute inset-0 [&_fieldset>svg]:overflow-visible">
              {mapPeers.some(peerLocation) ? (
                <HomeNodeMap
                  key={network}
                  nodes={mapPeers}
                  selectedHashes={selectedIds}
                  label="peers"
                  getId={peerId}
                  getLocation={peerLocation}
                  getCountries={peerCountries}
                  onSelectCountry={(code) =>
                    handleCountryChange(code === filters.country ? null : code)
                  }
                />
              ) : (
                <p className="grid h-full place-items-center text-sm text-muted-foreground">
                  {allPeers
                    ? "No peer locations"
                    : isFetching
                      ? "Loading peers…"
                      : "Map unavailable"}
                </p>
              )}
            </div>
          </div>
        </section>

        <PeersFilterBar
          filters={filters}
          search={search}
          userAgents={userAgents}
          total={peers.length}
          filteredTotal={total}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClear={handleClearFilters}
        />

        <PeersTable
          rows={pageData}
          busy={isFetching}
          emptyMessage="No peers found."
        />
        {total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            pageCount={Math.ceil(total / pageSize)}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
        <p className="text-xs text-muted-foreground">
          IP geolocation:{" "}
          <a className="underline" href="https://db-ip.com/">
            DB-IP
          </a>
          {" · "}
          <a
            className="underline"
            href="https://creativecommons.org/licenses/by/4.0/"
          >
            CC BY 4.0
          </a>
        </p>
      </div>
    </div>
  );
}
