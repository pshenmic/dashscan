import { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import Supercluster from "supercluster";
import { MapGeography } from "@/components/map-geography";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ApiMasternode } from "@/lib/api/types";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  masternodeCountries,
  masternodeDistribution,
} from "@/themes/dash/lib/masternode-metrics";

const geographyStyle = {
  fill: "var(--foreground)",
  fillOpacity: 0.08,
  stroke: "var(--card)",
  strokeWidth: 0.4,
  outline: "none",
};
const initialCenter: [number, number] = [0, 25];

export function HomeMasternodeMap({
  nodes,
  onSelect,
  selectedHashes,
  onSelectCountry,
}: {
  nodes: ApiMasternode[];
  onSelect: (hashes: string[]) => void;
  selectedHashes: Set<string> | null;
  onSelectCountry: (code: string) => void;
}) {
  return (
    <HomeNodeMap
      nodes={nodes}
      onSelect={onSelect}
      selectedHashes={selectedHashes}
      onSelectCountry={onSelectCountry}
      label="masternodes"
      getId={(node) => node.proTxHash}
      getLocation={(node) => masternodeDistribution([node])?.locations[0]}
      getCountries={masternodeCountries}
    />
  );
}

export function HomeNodeMap<Node>({
  nodes,
  onSelect,
  selectedHashes = null,
  onSelectCountry,
  label,
  getId,
  getLocation,
  getCountries,
}: {
  nodes: Node[];
  onSelect?: (ids: string[]) => void;
  selectedHashes?: Set<string> | null;
  onSelectCountry?: (code: string) => void;
  label: string;
  getId: (node: Node) => string;
  getLocation: (node: Node) => { lat: number; lng: number } | undefined;
  getCountries: (
    nodes: Node[],
  ) => { code: string; name: string; nodes: Node[] }[];
}) {
  const container = useRef<HTMLFieldSetElement>(null);
  const [width, setWidth] = useState(742);
  const [position, setPosition] = useState({
    coordinates: initialCenter,
    zoom: 1,
  });
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(1, entry.contentRect.width)),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const index = useMemo(() => {
    const cluster = new Supercluster<{ node: Node }>({
      radius: 48,
      maxZoom: 16,
    });
    cluster.load(
      nodes.flatMap((node) => {
        const location = getLocation(node);
        return location
          ? [
              {
                type: "Feature" as const,
                properties: { node },
                geometry: {
                  type: "Point" as const,
                  coordinates: [location.lng, location.lat],
                },
              },
            ]
          : [];
      }),
    );
    return cluster;
  }, [nodes, getLocation]);
  const zoomLevel = Math.max(
    0,
    Math.min(16, Math.floor(Math.log2((width * position.zoom) / 512))),
  );
  const markers = index.getClusters([-180, -90, 180, 90], zoomLevel);
  const changeZoom = (factor: number) => {
    setActive(null);
    setPosition((current) => ({
      ...current,
      zoom: Math.max(0.6, Math.min(8, current.zoom * factor)),
    }));
  };

  return (
    <fieldset
      ref={container}
      className="relative h-full min-w-0"
      aria-label={`${label} locations`}
    >
      <ComposableMap
        width={width}
        height={207}
        projection="geoEqualEarth"
        projectionConfig={{ scale: width / 5.8 }}
        className="h-full w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        role="group"
        aria-label="Interactive map: scroll or pinch to zoom; keyboard +, − and 0"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (["+", "=", "-", "0"].includes(event.key)) {
            event.preventDefault();
            if (event.key === "0") {
              setPosition({ coordinates: initialCenter, zoom: 1 });
              setActive(null);
            } else changeZoom(event.key === "-" ? 0.5 : 2);
          }
        }}
      >
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={0.6}
          maxZoom={8}
          filterZoomEvent={(event) =>
            event.type !== "dblclick" &&
            (event.type === "wheel" ||
              !(
                event.target instanceof Element &&
                event.target.closest("button")
              ))
          }
          onMoveStart={() => setActive(null)}
          onMoveEnd={({ coordinates, zoom }) =>
            setPosition((current) => ({
              coordinates: coordinates ?? current.coordinates,
              zoom: zoom ?? current.zoom,
            }))
          }
        >
          <Geographies geography="/world-110m.json">
            {({ geographies }) =>
              geographies.map((geography) => (
                <MapGeography
                  key={geography.rsmKey}
                  geography={geography}
                  styles={{
                    default: geographyStyle,
                    hover: geographyStyle,
                    pressed: geographyStyle,
                  }}
                />
              ))
            }
          </Geographies>
          {markers.map((feature) => {
            const clusterId =
              "cluster_id" in feature.properties
                ? feature.properties.cluster_id
                : null;
            const key =
              clusterId !== null
                ? `cluster-${clusterId}`
                : getId(feature.properties.node);
            const members =
              clusterId !== null
                ? index
                    .getLeaves(clusterId, Infinity)
                    .map((point) => point.properties.node)
                : [feature.properties.node];
            const count = members.length;
            const matching = selectedHashes
              ? members.filter((node) => selectedHashes.has(getId(node))).length
              : 0;
            const groups = active === key ? getCountries(members) : [];
            return (
              <Marker
                key={key}
                coordinates={[
                  feature.geometry.coordinates[0],
                  feature.geometry.coordinates[1],
                ]}
              >
                <g transform={`scale(${1 / position.zoom})`}>
                  <foreignObject
                    x={-22}
                    y={-22}
                    width={44}
                    height={44}
                    style={{ overflow: "visible" }}
                  >
                    <Popover
                      open={active === key}
                      onOpenChange={(open) => setActive(open ? key : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Inspect group of ${metricNumber(count, 0)} ${label}${selectedHashes ? `; ${metricNumber(matching, 0)} match the filter` : ""}`}
                          data-filter-match={
                            selectedHashes ? matching > 0 : undefined
                          }
                          className={`flex size-11 items-center justify-center rounded-full border-[5px] border-brand/20 bg-brand bg-clip-padding text-xs font-extrabold tabular-nums text-primary-foreground shadow-sm hover:bg-action-solid focus-visible:outline-2 focus-visible:outline-ring data-[filter-match=false]:opacity-40 ${active === key || matching > 0 ? "ring-2 ring-foreground" : ""}`}
                        >
                          {count > 999
                            ? `${Math.floor(count / 1000)}k+`
                            : metricNumber(count, 0)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-64 max-w-[calc(100vw-2rem)] rounded-2xl p-4"
                        side="top"
                      >
                        <p className="font-extrabold">
                          {metricNumber(count, 0)} {label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Geographic group · approximate IP locations
                        </p>
                        {selectedHashes && (
                          <p className="mt-2 text-xs text-accent">
                            {metricNumber(matching, 0)} of{" "}
                            {metricNumber(count, 0)} nodes match the current
                            filter.
                          </p>
                        )}
                        <ul className="my-3 max-h-32 space-y-1 overflow-y-auto text-sm">
                          {groups.map((group) => (
                            <li key={group.code} className="min-w-0">
                              {onSelectCountry ? (
                                <button
                                  type="button"
                                  aria-label={`Filter by ${group.name}`}
                                  className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 text-left hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring"
                                  onClick={() => {
                                    onSelectCountry(group.code);
                                    setActive(null);
                                  }}
                                >
                                  <span className="min-w-0 break-words text-accent">
                                    {group.name}
                                  </span>
                                  <span className="shrink-0 tabular-nums">
                                    {metricNumber(group.nodes.length, 0)}
                                  </span>
                                </button>
                              ) : (
                                <div className="flex items-center justify-between gap-3 py-2">
                                  <span>{group.name}</span>
                                  <span className="tabular-nums">
                                    {metricNumber(group.nodes.length, 0)}
                                  </span>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                        {onSelect && (
                          <>
                            <p className="mb-3 text-xs text-muted-foreground">
                              Choose a country to show all its nodes, or show
                              only this geographic group.
                            </p>
                            <button
                              type="button"
                              className="min-h-10 w-full rounded-xl bg-action-subtle px-3 text-sm text-accent focus-visible:outline-2 focus-visible:outline-ring"
                              onClick={() => {
                                onSelect(members.map(getId));
                                setActive(null);
                              }}
                            >
                              Show in list
                            </button>
                          </>
                        )}
                      </PopoverContent>
                    </Popover>
                  </foreignObject>
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>
    </fieldset>
  );
}
