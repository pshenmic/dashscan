import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useId, useMemo } from "react";
import { type ApiPeer, allPeersQueryOptions } from "@/lib/api/peers";
import { appStore } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  peerClient,
  peerCountries,
  peerLocation,
  peerSlices,
} from "@/themes/dash/lib/network-metrics";
import { HomeIcon } from "./home-icon";
import { HomeNodeMap } from "./home-masternode-map";
import { MissingApiData } from "./missing-api-data";

const colors = [
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--chart-3)",
];
const peerId = (peer: ApiPeer) => peer.address;

function Distribution({
  title,
  values,
  status,
}: {
  title: string;
  values: string[];
  status: string | null;
}) {
  const slices = peerSlices(values);
  const gradient = slices
    .map((slice, index) => `${colors[index]} ${slice.start}% ${slice.end}%`)
    .join(", ");
  return (
    <div className="grid min-w-0 items-center gap-5 rounded-3xl bg-foreground/3 p-6 sm:grid-cols-[100px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[100px_minmax(0,1fr)]">
      <div
        aria-hidden="true"
        className="size-[100px] shrink-0 rounded-full bg-foreground/5"
        style={
          slices.length
            ? { background: `conic-gradient(${gradient})` }
            : undefined
        }
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm text-muted-foreground">{title}</h3>
        {status || !values.length ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {status ?? "No peers observed"}
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {slices.map((slice, index) => (
              <li
                key={slice.label}
                className="flex min-w-0 items-center gap-1.5"
                title={`${slice.label}: ${metricNumber(slice.count, 0)} peers`}
              >
                <span
                  className={`min-w-0 truncate rounded-lg px-2 py-1.5 ${index === 0 ? "text-primary-foreground" : "text-foreground"}`}
                  style={{ background: colors[index] }}
                >
                  {slice.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {metricNumber(slice.percent, 1)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function HomeNetwork() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const peers = useQuery(allPeersQueryOptions({ network }));
  const data = useMemo(() => {
    const nodes = peers.data ?? [];
    const countries = peerCountries(nodes);
    return {
      nodes,
      located: nodes.filter(peerLocation).length,
      available: nodes.filter((peer) => peer.available).length,
      versions: nodes.map((peer) => peerClient(peer.userAgent).version),
      clients: nodes.map((peer) => peerClient(peer.userAgent).name),
      countries: countries.flatMap((country) =>
        country.nodes.map(() => country.name),
      ),
    };
  }, [peers.data]);
  const status = peers.isPending
    ? "Loading peers…"
    : peers.isError && !peers.data
      ? "Peers unavailable"
      : null;
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
            <span className="font-extrabold text-brand">Network</span> Stats
          </h2>
          <p className="dash-body mt-3 text-foreground/50">
            Explore peers observed by the Dash network crawler, their locations,
            client versions, and user agents.
          </p>
          <Link
            to="/peers"
            className="dash-home-action mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full bg-action-subtle py-2 pl-6 pr-2 text-brand hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore Network
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
              <HomeIcon name="explore" />
            </span>
          </Link>
        </div>
        <div className="min-w-0">
          <h3 className="dash-body">Peers Map</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-[32px] font-extrabold leading-tight">
              {peers.data ? metricNumber(data.nodes.length, 0) : "—"}{" "}
              <span className="text-base font-medium">Peers Total</span>
            </p>
            <MissingApiData
              inline
              description="The API does not provide historical peer counts for a growth comparison."
            />
          </div>
          <div className="relative mt-6 h-[207px] overflow-hidden rounded-3xl border border-foreground/4 bg-gradient-to-b from-transparent to-foreground/4">
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
              />
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No peer locations available
              </p>
            )}
          </div>
          {peers.data && (
            <p className="mt-2 text-xs text-muted-foreground">
              {metricNumber(data.available, 0)} reachable ·{" "}
              {metricNumber(data.located, 0)} located · Approximate IP locations
            </p>
          )}
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
          <Distribution
            title="Versions Pie Chart"
            values={data.versions}
            status={status}
          />
          <Distribution
            title="Countries Pie Chart"
            values={data.countries}
            status={status}
          />
          <Distribution
            title="User Agent Pie Chart"
            values={data.clients}
            status={status}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          All observed peers, including unreachable peers. Versions are reported
          by clients; missing metadata is included as Unknown. This crawler
          snapshot is not a census of the entire network.
        </p>
      </div>
      <div className="grid items-center gap-6 sm:grid-cols-[184px_minmax(0,1fr)]">
        <div>
          <h3 className="text-sm text-muted-foreground">Hardforks</h3>
          <p className="mt-2 text-[32px] font-extrabold">
            — <span className="text-base font-medium">Forks</span>
          </p>
        </div>
        <MissingApiData
          className="rounded-3xl p-6"
          description="The API does not expose network upgrade deployments, activation heights, statuses, or dates. The timeline will appear here when this data is available."
        />
      </div>
    </section>
  );
}
