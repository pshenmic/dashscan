import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { CircleCheck, Network, Server, ServerCrash } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  type ApiPeer,
  allPeersQueryOptions,
  derivePeerUserAgents,
  peerUserAgentsQueryOptions,
} from "@/lib/api/peers";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { appStore } from "@/lib/store";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import {
  countryFlagEmoji,
  countryName,
  formatLocation,
} from "@/themes/neo/components/masternode-map/iso-codes";
import { PeersDistribution } from "@/themes/neo/components/peers-distribution";
import {
  EMPTY_PEER_FILTERS,
  type PeerFilters,
  PeersFilterBar,
} from "@/themes/neo/components/peers-filter-bar";
import { PeersMap } from "@/themes/neo/components/peers-map";
import { Badge } from "@/themes/neo/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";

const PAGINATION_PAGE_SIZE = 10;

const EMPTY_PEERS: ApiPeer[] = [];

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
        {row.lastSeen ? formatRelativeTime(row.lastSeen) : "—"}
      </span>
    ),
  },
];

export default function RedesignPeersListPage() {
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: ApiPeer[] = [];
    for (const { peer, haystack } of searchable) {
      if (filters.status === "available" && !peer.available) continue;
      if (filters.status === "unavailable" && peer.available) continue;
      if (filters.country && peer.geo?.countryCode !== filters.country)
        continue;
      if (filters.userAgent && peer.userAgent !== filters.userAgent) continue;
      if (filters.ip && peer.host !== filters.ip) continue;
      if (q && !haystack.includes(q)) continue;
      out.push(peer);
    }
    return out;
  }, [searchable, search, filters]);

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
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Peers
          </h1>
          <p className="text-sm text-muted-foreground">
            Peer-to-peer nodes discovered by the network crawler.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total Peers</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {stats.total > 0 ? formatCompact(stats.total) : "—"}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Network className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {stats.total > 0 ? stats.available.toLocaleString() : "—"}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-success/12 [&_svg]:text-success">
                  <CircleCheck className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Unavailable</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {stats.total > 0 ? stats.unavailable.toLocaleString() : "—"}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-destructive/12 [&_svg]:text-destructive">
                  <ServerCrash className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
        </div>

        <PeersDistribution
          total={stats.total}
          available={stats.available}
          userAgents={userAgents}
          isLoading={isFetching && peers.length === 0}
          status={filters.status}
          userAgent={filters.userAgent}
          onStatusChange={(status) =>
            handleFiltersChange({ ...filters, status })
          }
          onUserAgentChange={(userAgent) =>
            handleFiltersChange({ ...filters, userAgent })
          }
        />

        <PeersMap
          variant="page"
          filteredPeers={filtered}
          selectedCountry={filters.country}
          onSelectCountry={handleCountryChange}
          statusFilter={filters.status}
          onStatusFilterChange={(status) =>
            handleFiltersChange({ ...filters, status })
          }
        />

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
      </div>
    </div>
  );
}
