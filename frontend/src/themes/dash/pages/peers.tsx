import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useCallback, useMemo, useRef, useState } from "react";
import { countryName } from "@/components/explorer/geo/iso-codes";
import {
  EMPTY_PEER_FILTERS,
  type PeerFilters,
} from "@/components/explorer/peers-filter-bar";
import { Badge } from "@/components/explorer/ui/badge";
import {
  type ApiPeer,
  allPeersQueryOptions,
  derivePeerUserAgents,
  isValidIpv4,
  peerUserAgentsQueryOptions,
} from "@/lib/api/peers";
import { formatNumber } from "@/lib/format";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { HomeNodeMap } from "@/themes/dash/components/home-masternode-map";
import { LoadMore } from "@/themes/dash/components/load-more";
import { Pagination } from "@/themes/dash/components/pagination";
import { PeersTable } from "@/themes/dash/components/peers-table";
import {
  peerClientLabel,
  peerCountries,
  peerLocation,
} from "@/themes/dash/lib/network-metrics";

const PAGINATION_PAGE_SIZE = 10;

const EMPTY_PEERS: ApiPeer[] = [];
const peerId = (peer: ApiPeer) => peer.address;

function searchHaystack(peer: ApiPeer): string {
  return [
    peer.address,
    peer.geo?.city ?? "",
    peer.geo ? countryName(peer.geo.countryCode) : "",
  ]
    .join(" ")
    .toLowerCase();
}

export default function PeersListPage() {
  const network = useStore(appStore, (state) => state.network);
  const [search, setSearch] = useState("");
  const [protocol, setProtocol] = useState("");
  const [mode, setMode] = useTableViewMode("dash-peers", "pagination");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE);
  const [filters, setFilters] = useState<PeerFilters>(EMPTY_PEER_FILTERS);
  const mapRef = useRef<HTMLElement>(null);
  const [located, setLocated] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

  const {
    data: allPeers,
    isFetching,
    isError,
    refetch,
  } = useQuery(allPeersQueryOptions({ network }));
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

  const agentOptions = useMemo(() => {
    const options = userAgents.map(({ userAgent, count }) => ({
      value: userAgent,
      label: peerClientLabel(userAgent),
      count,
    }));
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const { label } of options) {
      if (seen.has(label)) duplicates.add(label);
      seen.add(label);
    }
    return options.map((option) =>
      duplicates.has(option.label)
        ? { ...option, label: option.value }
        : option,
    );
  }, [userAgents]);

  const searchable = useMemo(
    () => peers.map((peer) => ({ peer, haystack: searchHaystack(peer) })),
    [peers],
  );

  const mapPeers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const exactIp = isValidIpv4(q);
    const out: ApiPeer[] = [];
    for (const { peer, haystack } of searchable) {
      if (filters.status === "available" && !peer.available) continue;
      if (filters.status === "unavailable" && peer.available) continue;
      if (filters.userAgent && peer.userAgent !== filters.userAgent) continue;
      if (
        protocol.trim() &&
        !String(peer.protocolVersion ?? "").includes(protocol.trim())
      )
        continue;
      if (q && (exactIp ? peer.host !== q : !haystack.includes(q))) continue;
      out.push(peer);
    }
    return out;
  }, [searchable, search, protocol, filters.status, filters.userAgent]);

  const countries = useMemo(() => peerCountries(mapPeers), [mapPeers]);
  const filtered = filters.country
    ? (countries.find(({ code }) => code === filters.country)?.nodes ??
      EMPTY_PEERS)
    : mapPeers;
  const target =
    located && filtered.some((peer) => peer.address === located.address)
      ? located
      : null;
  const highlighted = useMemo(
    () => (target ? new Set([target.address]) : null),
    [target],
  );
  const selectedIds = useMemo(
    () => (filters.country ? new Set(filtered.map(peerId)) : null),
    [filtered, filters.country],
  );

  const total = filtered.length;

  const handleSearchChange = useCallback((value: string) => {
    setLocated(null);
    setSearch(value);
    setPage(1);
  }, []);
  const handleFiltersChange = useCallback((next: PeerFilters) => {
    setLocated(null);
    setFilters(next);
    setPage(1);
  }, []);
  const handleCountryChange = useCallback((code: string | null) => {
    setLocated(null);
    setFilters((current) => ({ ...current, country: code }));
    setPage(1);
  }, []);
  const handleClearFilters = useCallback(() => {
    setLocated(null);
    setFilters(EMPTY_PEER_FILTERS);
    setSearch("");
    setProtocol("");
    setPage(1);
  }, []);

  const infinite = mode === "infinite";
  const size = infinite ? 25 : pageSize;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, pageCount);
  const hasFilters = !!(
    filters.country ||
    filters.userAgent ||
    filters.status !== "all" ||
    search ||
    protocol
  );
  const pageData = useMemo(() => {
    return filtered.slice(
      infinite ? 0 : (currentPage - 1) * size,
      currentPage * size,
    );
  }, [filtered, infinite, currentPage, size]);

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
          ref={mapRef}
          tabIndex={-1}
          className="relative overflow-x-clip overflow-y-visible"
        >
          <div className="relative h-[207px]">
            <div className="absolute inset-0 [&_fieldset>svg]:overflow-visible">
              {mapPeers.some(peerLocation) ? (
                <HomeNodeMap
                  key={network}
                  nodes={mapPeers}
                  focusLocation={target ?? undefined}
                  selectedHashes={highlighted ?? selectedIds}
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

        <section aria-label="Peer list" className="relative z-10 min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {allPeers && hasFilters && (
              <span className="text-sm text-muted-foreground">
                {formatNumber(total)} {total === 1 ? "peer" : "peers"}
              </span>
            )}
            {(
              [
                ["Peer address", search, () => handleSearchChange("")],
                [
                  "Protocol version",
                  protocol,
                  () => {
                    setProtocol("");
                    setLocated(null);
                    setPage(1);
                  },
                ],
                [
                  "Status",
                  filters.status === "all"
                    ? ""
                    : filters.status === "available"
                      ? "Available"
                      : "Unavailable",
                  () => handleFiltersChange({ ...filters, status: "all" }),
                ],
                [
                  "User agent",
                  agentOptions.find(
                    (option) => option.value === filters.userAgent,
                  )?.label ?? filters.userAgent,
                  () => handleFiltersChange({ ...filters, userAgent: null }),
                ],
                [
                  "Country",
                  filters.country === "unknown"
                    ? "Unknown"
                    : filters.country
                      ? countryName(filters.country)
                      : "",
                  () => handleCountryChange(null),
                ],
              ] as const
            ).map(([label, value, clear]) =>
              value ? (
                <Badge
                  key={label}
                  asChild
                  variant={
                    label === "Status"
                      ? filters.status === "available"
                        ? "soft-success"
                        : "soft-destructive"
                      : "soft-accent"
                  }
                >
                  <button
                    type="button"
                    aria-label={`Remove filter: ${label}, ${value}`}
                    onClick={clear}
                  >
                    <span className="max-w-48 truncate">
                      {label}: {value}
                    </span>
                    <span aria-hidden="true">×</span>
                  </button>
                </Badge>
              ) : null,
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-accent hover:underline"
              >
                Clear filters
              </button>
            )}
            <fieldset
              aria-label="Loading mode"
              className="ml-auto inline-flex rounded-xl bg-secondary p-1"
            >
              {(["pagination", "infinite"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                    setPage(1);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground aria-pressed:bg-card aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {value === "pagination" ? "Pages" : "Scroll"}
                </button>
              ))}
            </fieldset>
          </div>
          {isError && (
            <p role="alert" className="mb-2 text-sm text-destructive">
              {allPeers ? "Could not refresh peers." : "Could not load peers."}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => void refetch()}
              >
                Try again
              </button>
            </p>
          )}
          <PeersTable
            onLocate={(peer) => {
              const point = peerLocation(peer);
              if (!point) return;
              setLocated({ address: peer.address, ...point });
              mapRef.current?.focus({ preventScroll: true });
              mapRef.current?.scrollIntoView({ block: "center" });
            }}
            search={search}
            onSearchChange={handleSearchChange}
            protocol={protocol}
            onProtocolChange={(value) => {
              setLocated(null);
              setProtocol(value);
              setPage(1);
            }}
            status={filters.status}
            onStatusChange={(status) =>
              handleFiltersChange({ ...filters, status })
            }
            country={filters.country}
            userAgent={filters.userAgent}
            countryPicker={countries.map(({ code, name, nodes }) => ({
              value: code,
              label: name,
              count: nodes.length,
            }))}
            agentPicker={agentOptions}
            onCountryChange={handleCountryChange}
            onAgentChange={(userAgent) =>
              handleFiltersChange({ ...filters, userAgent })
            }
            rows={pageData}
            busy={isFetching}
            emptyMessage={
              isError && !allPeers
                ? "Peers unavailable."
                : hasFilters
                  ? "No matching peers."
                  : "No peers reported."
            }
          />
          {total > 0 &&
            (infinite ? (
              currentPage < pageCount && (
                <LoadMore
                  loading={false}
                  failed={false}
                  onLoad={() => setPage(currentPage + 1)}
                />
              )
            ) : (
              <nav
                aria-label="Peer list pagination"
                className="mt-2 rounded-xl border border-border bg-card [&>div]:py-2"
              >
                <Pagination
                  align="end"
                  page={currentPage}
                  pageCount={pageCount}
                  pageSize={size}
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    setPageSize(next);
                    setPage(1);
                  }}
                />
              </nav>
            ))}
        </section>
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
