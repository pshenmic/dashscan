import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allMasternodesQueryOptions } from "@/lib/api/masternodes";
import { getIp, getMnStatusLabel, getMnTypeLabel } from "@/lib/format";
import { appStore, type Network } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  masternodeCountries,
  masternodeDistribution,
} from "@/themes/dash/lib/masternode-metrics";
import { HomeIcon } from "./home-icon";
import { HomeMasternodeMap } from "./home-masternode-map";
import { HomeTable } from "./home-table";
import { IdentifierLink } from "./identifier-link";
import { MissingApiData } from "./missing-api-data";

function Info({ label, children }: { label: string; children: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="size-6 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
        >
          <img
            src="/icons/home/info.svg"
            alt=""
            width={24}
            height={24}
            className="size-6 dark:invert"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[calc(100vw-2rem)] text-sm">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function HomeMasternodes() {
  const network = useStore(appStore, (state) => state.network);
  return <MasternodesSection key={network} network={network} />;
}

function MasternodesSection({ network }: { network: Network }) {
  const titleId = useId();
  const filterId = useId();
  const [countryCode, setCountryCode] = useState("all");
  const [groupHashes, setGroupHashes] = useState<Set<string> | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const [page, setPage] = useState(1);
  const nodes = useQuery({
    ...allMasternodesQueryOptions({ network }),
    refetchInterval: 60_000,
  });
  const distribution = useMemo(
    () => masternodeDistribution(nodes.data),
    [nodes.data],
  );
  const countries = useMemo(
    () => masternodeCountries(nodes.data),
    [nodes.data],
  );
  const selected = countries.find((country) => country.code === countryCode);
  const filtered = groupHashes
    ? (nodes.data ?? []).filter((node) => groupHashes.has(node.proTxHash))
    : countryCode === "all"
      ? (nodes.data ?? [])
      : (selected?.nodes ?? []);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  const selectedHashes =
    groupHashes ??
    (countryCode === "all"
      ? null
      : new Set(filtered.map((node) => node.proTxHash)));
  const focusList = () =>
    requestAnimationFrame(() => {
      listHeading.current?.focus({ preventScroll: true });
      listHeading.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
    });
  const selectCountry = (code: string) => {
    setGroupHashes(null);
    setCountryCode(code);
    setPage(1);
  };
  const number = (value: number | undefined) =>
    nodes.isError ? "—" : nodes.isPending ? "…" : metricNumber(value, 0);

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-8 rounded-3xl bg-card p-4 sm:p-8 lg:space-y-16 lg:rounded-[48px]"
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
            <span className="font-extrabold text-brand">Masternodes</span> Stats
          </h2>
          <p className="dash-body mt-3 text-foreground/50">
            Dash is powered by a network of masternodes that enable instant
            transactions, governance, and CoinJoin. Explore their status and
            payouts.
          </p>
          <Link
            to="/masternodes"
            className="mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full bg-action-subtle py-2 pl-6 pr-2 text-brand hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore Masternodes
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
              <HomeIcon name="explore" />
            </span>
          </Link>
        </div>
        <div className="min-w-0">
          <h3 className="dash-body">Masternodes Map</h3>
          <p className="mt-2 text-[32px] font-extrabold leading-tight">
            {number(distribution?.total)}{" "}
            <span className="text-base font-medium">Nodes Total</span>
          </p>
          <div className="relative mt-6 h-[207px] overflow-hidden rounded-3xl border border-foreground/4 bg-gradient-to-b from-transparent to-foreground/4">
            {nodes.isError ? (
              <div
                role="alert"
                className="flex h-full flex-col items-center justify-center gap-2 text-sm text-destructive"
              >
                Masternodes unavailable.
                <button
                  type="button"
                  className="underline"
                  onClick={() => void nodes.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : nodes.isPending ? (
              <output className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading masternodes…
              </output>
            ) : distribution?.located ? (
              <HomeMasternodeMap
                nodes={nodes.data ?? []}
                selectedHashes={selectedHashes}
                onSelectCountry={(code) => {
                  selectCountry(code);
                  focusList();
                }}
                onSelect={(hashes) => {
                  setGroupHashes(new Set(hashes));
                  setCountryCode("all");
                  setPage(1);
                  focusList();
                }}
              />
            ) : (
              <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                {distribution?.total === 0
                  ? "No masternodes found."
                  : "No geolocation data available."}
              </p>
            )}
          </div>
          <div className="mt-2 flex min-h-6 items-center justify-between gap-2">
            <p className="dash-label-small min-w-0 truncate text-foreground/48">
              Select a group to explore its nodes.
            </p>
            <Info label="About map coverage">
              IP locations are approximate. Nodes without coordinates remain in
              the list. Groups may span multiple countries. Drag to move the
              map; scroll or pinch to zoom. With the map focused, use + and − to
              zoom or 0 to reset. Counts include all node statuses.
            </Info>
          </div>
        </div>
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,623px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-h-[260px] flex-1 flex-col rounded-3xl bg-foreground/3 p-6">
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="dash-body">Masternode growth</h3>
                <p className="mt-2 text-[32px] font-extrabold leading-tight">
                  — <span className="text-base font-medium">Nodes</span>
                </p>
                <p className="dash-body-compact mt-2 text-foreground/48">
                  Compared to last month
                </p>
              </div>
              <Info label="About masternode growth">
                The current masternode list is a snapshot, not a historical
                series. Registration timestamps alone cannot account for nodes
                removed from the network.
              </Info>
            </div>
            <div className="flex flex-1 items-center py-6">
              <MissingApiData
                className="w-full"
                description="Masternode count history and monthly growth are not exposed by the API. The chart will appear when historical data is available."
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Masternode count", count: distribution?.regular },
              { label: "Evonode count", count: distribution?.evo },
            ].map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-3xl bg-foreground/3 px-6 py-4"
              >
                <h3 className="dash-body-compact text-foreground/50">
                  {item.label}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="dash-metric text-brand">
                    {number(item.count)}{" "}
                    <span className="font-medium">Nodes</span>
                  </p>
                  <MissingApiData
                    inline
                    description="Year-over-year changes require historical node counts, which the API does not provide."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-3xl bg-foreground/3 p-4 sm:p-6">
          <div className="flex justify-between gap-3">
            <div className="min-w-0">
              <h3
                ref={listHeading}
                tabIndex={-1}
                className="dash-heading-section rounded focus-visible:outline-2 focus-visible:outline-ring"
              >
                Masternodes List
              </h3>
              <p className="dash-body-compact mt-2 h-5 truncate tabular-nums text-foreground/48">
                {number(nodes.data ? filtered.length : undefined)} Masternodes
                Found
              </p>
            </div>
            <Info label="About the masternodes list">
              Six masternodes per page, ordered by their last paid block, newest
              first. The country selection filters this list only. Enabled and
              banned are current node statuses, not uptime measurements.
            </Info>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <div className="min-w-0">
              <label
                htmlFor={filterId}
                className="dash-label-small mb-1 block text-muted-foreground"
              >
                Country
              </label>
              <Select
                value={groupHashes ? "map-group" : countryCode}
                disabled={nodes.isPending || nodes.isError}
                onValueChange={(value) => {
                  if (value !== "map-group") selectCountry(value);
                }}
              >
                <SelectTrigger
                  id={filterId}
                  className="w-full min-w-0 rounded-xl border-border bg-card px-3 data-[size=default]:h-10 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="max-h-[min(18rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] rounded-xl bg-card"
                >
                  {groupHashes && (
                    <SelectItem value="map-group">
                      Selected map group
                    </SelectItem>
                  )}
                  <SelectItem value="all">All countries</SelectItem>
                  {countryCode !== "all" && !selected && (
                    <SelectItem value={countryCode}>{countryCode}</SelectItem>
                  )}
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              disabled={countryCode === "all" && !groupHashes}
              onClick={() => selectCountry("all")}
              className="h-10 rounded-xl px-3 text-sm text-accent hover:bg-action-subtle disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
            >
              Reset filter
            </button>
          </div>
          <div className="mt-4 h-[344px] overflow-auto">
            <HomeTable>
              <thead>
                <tr className="border-b border-foreground/8 text-foreground/48">
                  <th className="px-2 py-3 font-medium">IP Address</th>
                  <th className="px-2 py-3 font-medium">ProTxHash</th>
                  <th className="px-2 py-3 text-right font-medium">Type</th>
                  <th className="px-2 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {nodes.isError || nodes.isPending || rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-8 text-center text-muted-foreground"
                    >
                      {nodes.isError
                        ? "Masternodes unavailable."
                        : nodes.isPending
                          ? "Loading…"
                          : "No masternodes found."}
                    </td>
                  </tr>
                ) : (
                  rows.map((node) => (
                    <tr
                      key={node.proTxHash}
                      className="border-b border-foreground/8 last:border-0"
                    >
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <img
                            src="/icons/home/masternode.svg"
                            alt=""
                            width={24}
                            height={24}
                            className="size-6 shrink-0"
                          />
                          <span className="font-bold">
                            {getIp(node.address)}
                          </span>
                        </div>
                      </td>
                      <td data-grow className="px-2 py-2.5">
                        <IdentifierLink
                          value={node.proTxHash}
                          kind="masternode"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {getMnTypeLabel(node.type)}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs ${node.status.toUpperCase() === "ENABLED" ? "bg-action-subtle text-brand" : "bg-foreground/4 text-muted-foreground"}`}
                        >
                          {getMnStatusLabel(node.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </HomeTable>
          </div>
          {
            <nav
              aria-label="Masternodes list pages"
              className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                className="min-h-10 rounded-xl px-3 hover:bg-action-subtle disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                Previous
              </button>
              <span>
                {metricNumber(currentPage, 0)} / {metricNumber(pageCount, 0)}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
                className="min-h-10 rounded-xl px-3 hover:bg-action-subtle disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                Next
              </button>
            </nav>
          }
        </div>
      </div>
    </section>
  );
}
