import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { X } from "lucide-react";
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
const peerAvailable = (peer: ApiPeer) => peer.available;

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
        <section
          aria-label="Peer locations"
          ref={mapRef}
          tabIndex={-1}
          className="relative overflow-x-clip overflow-y-visible pt-[max(1rem,calc(23%_-_11rem))]"
        >
          <div className="relative h-[207px]">
            <div className="absolute inset-0 [&_fieldset>svg]:overflow-visible">
              {mapPeers.some(peerLocation) ? (
                <HomeNodeMap
                  key={network}
                  nodes={mapPeers}
                  getAvailability={peerAvailable}
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

        <section
          aria-label="Peer list"
          className="relative z-10 min-w-0 rounded-3xl bg-card p-4 sm:p-6"
        >
          <header className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="dash-heading-section flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-extrabold text-brand">Peers</span>{" "}
              <span className="tabular-nums">
                {allPeers && hasFilters ? `${formatNumber(total)} of ` : ""}
                {allPeers ? formatNumber(allPeers.length) : "—"}
              </span>
            </h1>
            {hasFilters && (
              <fieldset
                aria-label="Active filters"
                className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5"
              >
                {(
                  [
                    [
                      "address",
                      "Peer address",
                      search,
                      () => handleSearchChange(""),
                    ],
                    [
                      "protocolVersion",
                      "Protocol version",
                      protocol,
                      () => {
                        setProtocol("");
                        setLocated(null);
                        setPage(1);
                      },
                    ],
                    [
                      "available",
                      "Status",
                      filters.status === "all"
                        ? ""
                        : filters.status === "available"
                          ? "Available"
                          : "Unconfirmed",
                      () => handleFiltersChange({ ...filters, status: "all" }),
                    ],
                    [
                      "userAgent",
                      "User agent",
                      agentOptions.find(
                        (option) => option.value === filters.userAgent,
                      )?.label ?? filters.userAgent,
                      () =>
                        handleFiltersChange({ ...filters, userAgent: null }),
                    ],
                    [
                      "country",
                      "Country",
                      filters.country === "unknown"
                        ? "Unknown"
                        : filters.country
                          ? countryName(filters.country)
                          : "",
                      () => handleCountryChange(null),
                    ],
                  ] as const
                ).map(([column, label, value, clear]) =>
                  value ? (
                    <Badge
                      key={label}
                      className="max-w-full gap-1 overflow-visible py-0 pl-3 pr-0.5"
                      variant={
                        label === "Status"
                          ? filters.status === "available"
                            ? "soft-success"
                            : "soft"
                          : "soft-accent"
                      }
                    >
                      <span
                        className="max-w-48 truncate"
                        title={`${label}: ${value}`}
                      >
                        {label}: {value}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove filter: ${label}, ${value}`}
                        title={`Remove ${label.toLowerCase()} filter`}
                        className="inline-grid size-8 shrink-0 place-items-center rounded-full hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11"
                        onClick={(event) => {
                          const button = event.currentTarget;
                          const chips = Array.from(
                            button
                              .closest("fieldset")
                              ?.querySelectorAll("button") ?? [],
                          );
                          const index = chips.indexOf(button);
                          const next =
                            chips[index + 1] ??
                            chips[index - 1] ??
                            button
                              .closest("section")
                              ?.querySelector<HTMLButtonElement>(
                                `th[data-column="${column}"] button`,
                              );
                          next?.focus();
                          clear();
                        }}
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </Badge>
                  ) : null,
                )}
              </fieldset>
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
          </header>
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
                className="mt-4 overflow-x-auto"
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
