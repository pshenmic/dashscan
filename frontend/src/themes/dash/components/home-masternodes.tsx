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
import { allMasternodesQueryOptions } from "@/lib/api/masternodes";
import { chainHistoryQueryOptions } from "@/lib/api/stats";
import { getIp } from "@/lib/format";
import { appStore, type Network } from "@/lib/store";
import {
  percentageChange,
  snapshotChange,
  useHistoryRange,
  useHomeChainHistory,
} from "@/themes/dash/lib/home-history";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  masternodeCountries,
  masternodeDistribution,
} from "@/themes/dash/lib/masternode-metrics";
import { ChainHistoryChart } from "./chain-history-chart";
import { HomeIcon } from "./home-icon";
import { HomeMapSurface } from "./home-map-surface";
import { HomeMasternodeMap } from "./home-masternode-map";
import { HomeTable } from "./home-table";
import { IdentifierLink } from "./identifier-link";
import { InfoPopover } from "./info-popover";
import {
  MasternodeStatusBadge,
  MasternodeTypeBadge,
} from "./masternode-badges";
import { MissingApiData } from "./missing-api-data";

export function HomeMasternodes() {
  const network = useStore(appStore, (state) => state.network);
  return <MasternodesSection key={network} network={network} />;
}

function MasternodesSection({ network }: { network: Network }) {
  const history = useHomeChainHistory(network, 31);
  const growth = snapshotChange(history.data, "masternodes", 30);
  const dayRange = useHistoryRange(2);
  const yearAgo = useQuery(
    chainHistoryQueryOptions({
      network,
      timestampStart: new Date(
        Date.parse(dayRange.timestampStart) - 365 * 86_400_000,
      ).toISOString(),
      timestampEnd: new Date(
        Date.parse(dayRange.timestampEnd) - 365 * 86_400_000,
      ).toISOString(),
      intervalsCount: 2,
    }),
  );
  const latestSnapshot = history.data?.at(-1)?.data;
  const previousSnapshot = yearAgo.data?.at(-1)?.data;
  const titleId = useId();
  const filterId = useId();
  const nodesTitleId = useId();
  const mapRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef<HTMLDivElement>(null);
  const growthRef = useRef<HTMLDivElement>(null);
  const [countryCode, setCountryCode] = useState("all");
  const [groupHashes, setGroupHashes] = useState<Set<string> | null>(null);
  const listResults = useRef<HTMLElement>(null);
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
      listResults.current?.focus({ preventScroll: true });
      listResults.current?.scrollIntoView({
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
      className="relative isolate grid items-start gap-8 py-4 sm:py-8 xl:grid-cols-[minmax(0,442px)_minmax(0,1fr)] xl:gap-x-16 xl:[--list-offset:128px] 2xl:[--list-offset:160px]"
    >
      <div className="min-w-0 xl:col-start-1 xl:row-start-1">
        <p className="text-xl font-medium text-muted-foreground">Dash Chain</p>
        <h2
          id={titleId}
          className="dash-heading-page mt-2 sm:dash-heading-hero"
        >
          <span className="font-extrabold text-brand">Masternodes</span> Stats
        </h2>
        <p className="dash-body mt-3 text-muted-foreground">
          Dash is powered by a network of masternodes that enable instant
          transactions, governance, and CoinJoin. Explore their status and
          payouts.
        </p>
        <Link
          to="/masternodes"
          className="dash-home-action dash-home-action-subtle mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2 text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Explore Masternodes
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
            <HomeIcon name="explore" />
          </span>
        </Link>
      </div>
      <section
        data-map-panel
        aria-labelledby={nodesTitleId}
        className="relative isolate min-w-0 rounded-3xl p-4 sm:p-6 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:grid xl:grid-rows-subgrid"
      >
        <HomeMapSurface
          mapRef={mapRef}
          insetRef={insetRef}
          cutoutRef={growthRef}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 id={nodesTitleId} className="dash-heading-section">
                <InfoPopover label="About masternodes" trigger="Masternodes">
                  Locations are estimated from IP addresses. Nodes without
                  coordinates appear only in the list. Country selection filters
                  the list and highlights matching nodes on the map. Rows are
                  ordered by last paid block, newest first.
                </InfoPopover>
              </h3>
            </div>
            <div className="relative w-full min-w-0 sm:w-48 sm:shrink-0">
              <label htmlFor={filterId} className="sr-only">
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
                    <SelectItem
                      key={country.code}
                      value={country.code}
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
          <p
            aria-live="polite"
            aria-atomic="true"
            className="mt-2 text-[32px] font-extrabold leading-tight tabular-nums"
          >
            {number(nodes.data ? filtered.length : undefined)}{" "}
            <span className="text-base font-medium text-muted-foreground">
              {selectedHashes ? (
                <>of {number(distribution?.total)} nodes</>
              ) : (
                "Nodes Total"
              )}
            </span>
          </p>
          <div
            data-grid-map
            ref={mapRef}
            className="relative mt-6 h-[207px] overflow-hidden rounded-3xl"
          >
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
        </div>
        <div ref={insetRef} className="min-w-0 xl:ml-[var(--list-offset)]">
          <section
            ref={listResults}
            aria-label="Masternode results"
            tabIndex={-1}
            className="mt-6 h-[344px] overflow-auto rounded-lg border-t border-border focus-visible:outline-2 focus-visible:outline-ring xl:mt-0"
          >
            <HomeTable aria-label="Masternodes">
              <thead>
                <tr className="border-b border-foreground/8 text-muted-foreground">
                  <th scope="col" className="px-2 py-3 font-medium">
                    IP Address
                  </th>
                  <th scope="col" className="px-2 py-3 font-medium">
                    ProTxHash
                  </th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">
                    Type
                  </th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">
                    Status
                  </th>
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
                        <MasternodeTypeBadge type={node.type} />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <MasternodeStatusBadge status={node.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </HomeTable>
          </section>
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
      </section>
      <div
        ref={growthRef}
        className="relative flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-2 xl:w-[calc(100%+var(--list-offset)+40px)]"
      >
        <div className="flex min-h-[260px] min-w-0 flex-1 flex-col gap-8 rounded-3xl dash-home-panel p-6">
          <div className="relative min-w-0">
            <div className="flex min-w-0 flex-col gap-2">
              <h3 className="text-base font-medium leading-4">
                <InfoPopover
                  label="About masternode growth"
                  trigger="Regular masternode history"
                >
                  Regular masternodes across all statuses, excluding Evo nodes.
                  History uses Core snapshots, not registration dates. Only the
                  available continuous history is plotted.
                </InfoPopover>
              </h3>
              <div className="flex items-center gap-4">
                <p className="whitespace-nowrap text-[32px] font-extrabold leading-[1.0813]">
                  {number(distribution?.regular)}{" "}
                  <span className="text-base font-medium">Nodes</span>
                </p>
                {growth != null ? (
                  <span className="text-sm text-accent">
                    {growth > 0 ? "+" : ""}
                    {metricNumber(growth)}%
                  </span>
                ) : history.isSuccess ? (
                  <MissingApiData
                    inline
                    className="whitespace-nowrap"
                    description="The API has not yet provided two comparable masternode snapshots 30 days apart."
                  />
                ) : null}
              </div>
              <p className="text-sm font-medium leading-4 text-muted-foreground">
                30-day snapshot comparison
              </p>
            </div>
            <div className="absolute right-0 top-0"></div>
          </div>
          <div className="min-h-[117px] flex-1">
            <ChainHistoryChart
              data={history.data}
              metric="masternodes"
              label="Regular masternode snapshot history"
              formatValue={(value) => `${metricNumber(value, 0)} nodes`}
              loading={history.isPending}
              error={history.isError}
              onRetry={() => void history.refetch()}
              height={117}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              label: "Masternode count",
              count: distribution?.regular,
              change: percentageChange(
                latestSnapshot?.masternodes,
                previousSnapshot?.masternodes,
              ),
            },
            {
              label: "Evonode count",
              count: distribution?.evo,
              change: percentageChange(
                latestSnapshot?.evonodes,
                previousSnapshot?.evonodes,
              ),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="min-w-0 rounded-3xl dash-home-panel px-6 py-4"
            >
              <h3 className="dash-body-compact text-muted-foreground">
                {item.label}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="dash-metric text-accent">
                  {number(item.count)}{" "}
                  <span className="font-medium">Nodes</span>
                </p>
                {history.isPending || yearAgo.isPending ? (
                  <output aria-label="Loading yearly masternode comparison">
                    …
                  </output>
                ) : history.isError || yearAgo.isError ? (
                  <button
                    type="button"
                    className="text-xs text-destructive underline"
                    aria-label={`Retry yearly ${item.label.toLowerCase()} comparison`}
                    onClick={() => {
                      void history.refetch();
                      void yearAgo.refetch();
                    }}
                  >
                    Retry
                  </button>
                ) : item.change != null ? (
                  <span
                    className="text-xs text-muted-foreground"
                    title="Comparison of the latest daily snapshot with the snapshot 365 days earlier; includes all statuses."
                  >
                    {item.change > 0 ? "+" : ""}
                    {metricNumber(item.change)}% · 365D
                  </span>
                ) : history.isSuccess && yearAgo.isSuccess ? (
                  <MissingApiData
                    inline
                    description="The selected network does not have comparable masternode snapshots 365 days apart."
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
