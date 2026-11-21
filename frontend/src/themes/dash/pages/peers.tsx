import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { CircleCheck, Server, ServerCrash } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/explorer/data-table";
import {
  countryFlagEmoji,
  countryName,
  formatLocation,
} from "@/components/explorer/geo/iso-codes";
import {
  EMPTY_PEER_FILTERS,
  type PeerFilters,
  PeersFilterBar,
} from "@/components/explorer/peers-filter-bar";
import { HomeNodeMap } from "@/themes/dash/components/home-masternode-map";
import { peerCountries, peerLocation } from "@/themes/dash/lib/network-metrics";
import { Badge } from "@/components/explorer/ui/badge";
import { RelativeTime } from "@/components/relative-time";
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

const columns: DataTableColumn<ApiPeer>[] = [
  {
    id: "peer",
    header: "Peer",
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-base leading-none" aria-hidden="true">
          {row.geo ? countryFlagEmoji(row.geo.countryCode) : "🌐"}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-sm font-medium">
            <Server className="size-3.5 text-muted-foreground" />
            {row.address}
          </span>
          {row.geo && (
            <span className="truncate text-[11px] text-muted-foreground">
              {formatLocation(row.geo)}
            </span>
          )}
        </div>
      </div>
    ),
    width: 360,
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant={row.available ? "soft-success" : "soft-destructive"}>
        {row.available ? (
          <CircleCheck className="size-3" />
        ) : (
          <ServerCrash className="size-3" />
        )}
        {row.available ? "Available" : "Unavailable"}
      </Badge>
    ),
  },
  {
    id: "agent",
    header: "User Agent",
    cell: (row) => (
      <span className="truncate font-mono text-xs text-muted-foreground">
        {row.userAgent || "—"}
      </span>
    ),
    width: 220,
  },
  {
    id: "version",
    header: "Version",
    align: "right",
    cell: (row) => (
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {row.protocolVersion ?? "—"}
      </span>
    ),
  },
  {
    id: "lastseen",
    header: "Last Seen",
    align: "right",
    cell: (row) => (
      <span className="whitespace-nowrap text-sm text-muted-foreground">
        {row.lastSeen ? <RelativeTime timestamp={row.lastSeen} /> : "—"}
      </span>
    ),
  },
];

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

        <DataTable
          columns={columns}
          data={pageData}
          isLoading={isFetching && peers.length === 0}
          rowKey={(row) => row.address}
          emptyTitle="No peers"
          emptyDescription="Try clearing one or more peer filters."
          pagination={{
            pageIndex: page,
            pageSize,
            total,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
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
