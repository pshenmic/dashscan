import { useNavigate } from "@tanstack/react-router";
import { type GeoProjection, geoEqualEarth } from "d3-geo";
import { interpolateZoom } from "d3-interpolate";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  type CSSProperties,
  type MutableRefObject,
  memo,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Sphere,
  useZoomPanContext,
  ZoomableGroup,
} from "react-simple-maps";
import type { MasternodeGeoPoint } from "@/lib/api/masternodes";
import { getMnStatusBucket } from "@/lib/format";
import { cn } from "@/lib/utils";
import { alpha2FromNumeric, formatLocation } from "./iso-codes";
import { STATUS_COLOR } from "./status";
import {
  type ClusterFeature,
  getClusterLeafPoints,
  isCluster,
  mapZoomToSuperZoom,
  superZoomToMapZoom,
  useSuperclusterIndex,
} from "./use-clusters";

const GEO_URL = "/world-110m.json";

const INITIAL_CENTER: [number, number] = [0, 0];
const INITIAL_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 64;
const MAP_WIDTH = 980;
const MAP_BASE_SCALE = 165;
const MIN_ANIM_MS = 350;
const MAX_ANIM_MS = 950;

function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return INITIAL_ZOOM;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

type TooltipState =
  | { kind: "none" }
  | {
      kind: "node";
      x: number;
      y: number;
      point: MasternodeGeoPoint;
    }
  | {
      kind: "cluster";
      x: number;
      y: number;
      count: number;
      enabled: number;
      banned: number;
      other: number;
    };

const GEO_STROKE_W = 0.45;

const GEO_STYLE_DEFAULT = {
  fill: "var(--secondary)",
  stroke: "var(--border)",
  strokeWidth: GEO_STROKE_W,
  outline: "none",
  transition: "fill 200ms ease, stroke 200ms ease",
} as const;

const GEO_STYLE_DEFAULT_HIGHLIGHTED = {
  ...GEO_STYLE_DEFAULT,
  fill: "color-mix(in oklab, var(--accent) 22%, var(--secondary))",
  stroke: "color-mix(in oklab, var(--accent) 55%, var(--border))",
} as const;

const GEO_STYLE_HOVER_INTERACTIVE = {
  fill: "color-mix(in oklab, var(--accent) 14%, var(--secondary))",
  stroke: "var(--border)",
  strokeWidth: GEO_STROKE_W,
  outline: "none",
  cursor: "pointer",
} as const;

const GEO_STYLE_HOVER_PASSIVE = {
  ...GEO_STYLE_HOVER_INTERACTIVE,
  cursor: "default",
} as const;

const GEO_STYLE_PRESSED = {
  fill: "color-mix(in oklab, var(--accent) 26%, var(--secondary))",
  outline: "none",
} as const;

const GEO_STYLE_DEFAULT_BUNDLE = {
  default: GEO_STYLE_DEFAULT,
  hover: GEO_STYLE_HOVER_INTERACTIVE,
  pressed: GEO_STYLE_PRESSED,
} as const;

const GEO_STYLE_DEFAULT_PASSIVE_BUNDLE = {
  default: GEO_STYLE_DEFAULT,
  hover: GEO_STYLE_HOVER_PASSIVE,
  pressed: GEO_STYLE_PRESSED,
} as const;

const GEO_STYLE_HIGHLIGHTED_BUNDLE = {
  default: GEO_STYLE_DEFAULT_HIGHLIGHTED,
  hover: GEO_STYLE_HOVER_INTERACTIVE,
  pressed: GEO_STYLE_PRESSED,
} as const;

const GEO_STYLE_HIGHLIGHTED_PASSIVE_BUNDLE = {
  default: GEO_STYLE_DEFAULT_HIGHLIGHTED,
  hover: GEO_STYLE_HOVER_PASSIVE,
  pressed: GEO_STYLE_PRESSED,
} as const;

const MARKER_CURSOR_STYLE = { default: { cursor: "pointer" } } as const;

const MARKER_SCALE_STYLE: CSSProperties = {
  transformBox: "fill-box",
  transformOrigin: "center",
};

export function MasternodeMapCanvas({
  points,
  highlightedCountry,
  onSelectCountry,
  onSelectCluster,
  height = 460,
}: {
  points: MasternodeGeoPoint[];
  highlightedCountry?: string | null;
  onSelectCountry?: (code: string | null) => void;
  onSelectCluster?: (leaves: MasternodeGeoPoint[]) => void;
  height?: number;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [{ center, zoom }, setView] = useState<{
    center: [number, number];
    zoom: number;
  }>({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  });
  const viewRef = useRef({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM });
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ kind: "none" });
  const gradientId = useId();
  const glowId = useId();
  const sphereId = useId();

  const projection = useMemo(() => {
    const mapH = height + 40;
    return geoEqualEarth()
      .scale(MAP_BASE_SCALE)
      .translate([MAP_WIDTH / 2, mapH / 2]);
  }, [height]);

  const index = useSuperclusterIndex(points);

  const superZoom = mapZoomToSuperZoom(zoom);
  const clusters: ClusterFeature[] = useMemo(
    () => index.getClusters([-180, -85, 180, 85], superZoom),
    [index, superZoom],
  );

  const animateView = useCallback(
    (target: { center: [number, number]; zoom: number }) => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      const safeTarget = {
        center: target.center,
        zoom: clampZoom(target.zoom),
      };
      const start = {
        center: [...viewRef.current.center] as [number, number],
        zoom: viewRef.current.zoom,
      };
      const dx = safeTarget.center[0] - start.center[0];
      const dy = safeTarget.center[1] - start.center[1];
      const dz = safeTarget.zoom - start.zoom;
      if (
        Math.abs(dx) < 0.001 &&
        Math.abs(dy) < 0.001 &&
        Math.abs(dz) < 0.001
      ) {
        return;
      }
      const startPx = projection(start.center);
      const targetPx = projection(safeTarget.center);
      if (!startPx || !targetPx) {
        viewRef.current = safeTarget;
        setView(safeTarget);
        return;
      }
      const interp = interpolateZoom(
        [startPx[0], startPx[1], MAP_WIDTH / start.zoom],
        [targetPx[0], targetPx[1], MAP_WIDTH / safeTarget.zoom],
      );
      const duration = Math.max(
        MIN_ANIM_MS,
        Math.min(MAX_ANIM_MS, interp.duration),
      );
      isAnimatingRef.current = true;
      const startTime = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        if (t >= 1) {
          viewRef.current = safeTarget;
          setView(safeTarget);
          animationRef.current = null;
          isAnimatingRef.current = false;
          return;
        }
        const [cx, cy, w] = interp(t);
        const inv = projection.invert?.([cx, cy]);
        const z = MAP_WIDTH / w;
        const next = {
          center: (inv ?? safeTarget.center) as [number, number],
          zoom: clampZoom(z),
        };
        viewRef.current = next;
        setView(next);
        animationRef.current = requestAnimationFrame(tick);
      };
      animationRef.current = requestAnimationFrame(tick);
    },
    [projection],
  );

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    animateView({
      center: viewRef.current.center,
      zoom: viewRef.current.zoom * 1.6,
    });
  }, [animateView]);
  const handleZoomOut = useCallback(() => {
    animateView({
      center: viewRef.current.center,
      zoom: viewRef.current.zoom / 1.6,
    });
  }, [animateView]);
  const handleReset = useCallback(() => {
    animateView({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM });
  }, [animateView]);

  const handleMove = useCallback(
    (next: { coordinates: [number, number]; zoom: number }) => {
      if (isAnimatingRef.current) return;
      const safe = {
        center: next.coordinates,
        zoom: clampZoom(next.zoom),
      };
      viewRef.current = safe;
      setView(safe);
    },
    [],
  );

  const handleClusterClick = useCallback(
    (cluster: ClusterFeature) => {
      if (!isCluster(cluster)) return;
      const clusterId = cluster.properties.cluster_id;
      const expansionSuperZoom = index.getClusterExpansionZoom(clusterId);
      const expansionMapZoom = superZoomToMapZoom(expansionSuperZoom);
      const target = clampZoom(
        Math.max(viewRef.current.zoom * 1.6, expansionMapZoom),
      );
      const [lng, lat] = cluster.geometry.coordinates as [number, number];
      animateView({ center: [lng, lat], zoom: target });
      if (onSelectCluster) {
        onSelectCluster(getClusterLeafPoints(index, clusterId));
      }
    },
    [index, animateView, onSelectCluster],
  );

  const handleNodeClick = useCallback(
    (point: MasternodeGeoPoint) => {
      navigate({ to: "/masternodes/$hash", params: { hash: point.proTxHash } });
    },
    [navigate],
  );

  const showTooltip = useCallback(
    (
      event: ReactMouseEvent,
      state: Exclude<TooltipState, { kind: "none" }>,
    ) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        ...state,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [],
  );
  const hideTooltip = useCallback(() => setTooltip({ kind: "none" }), []);

  useEffect(() => {
    if (tooltip.kind === "none") return;
    const onScroll = () => hideTooltip();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tooltip.kind, hideTooltip]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const highlight = highlightedCountry?.toUpperCase() ?? null;
  const canReset =
    zoom !== INITIAL_ZOOM ||
    center[0] !== INITIAL_CENTER[0] ||
    center[1] !== INITIAL_CENTER[1];

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-[color:var(--secondary)] to-[color:var(--card)]"
      style={{
        height,
        touchAction: "none",
        overscrollBehavior: "contain",
      }}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: MAP_BASE_SCALE }}
        width={MAP_WIDTH}
        height={height + 40}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <radialGradient id={gradientId}>
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.95} />
            <stop
              offset="100%"
              stopColor="var(--accent-violet)"
              stopOpacity={0.9}
            />
          </radialGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ZoomableGroup
          center={center}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          translateExtent={[
            [0, 0],
            [MAP_WIDTH, height + 40],
          ]}
          onMoveEnd={handleMove}
        >
          <ViewSync
            projection={projection}
            viewRef={viewRef}
            isAnimatingRef={isAnimatingRef}
            width={MAP_WIDTH}
            height={height + 40}
          />
          <Sphere
            id={sphereId}
            fill="transparent"
            stroke="var(--border)"
            strokeWidth={0.5}
          />
          <Geographies geography={GEO_URL}>
            {({ geographies }) => (
              <CountryShapes
                geographies={geographies}
                highlight={highlight}
                onSelectCountry={onSelectCountry}
              />
            )}
          </Geographies>
          <g pointerEvents="auto">
            {clusters.map((cluster) => {
              const [lng, lat] = cluster.geometry.coordinates as [
                number,
                number,
              ];
              if (isCluster(cluster)) {
                return (
                  <ClusterMarker
                    key={`c-${cluster.properties.cluster_id}`}
                    cluster={cluster}
                    lng={lng}
                    lat={lat}
                    gradientId={gradientId}
                    glowId={glowId}
                    onClick={handleClusterClick}
                    onShowTooltip={showTooltip}
                    onHideTooltip={hideTooltip}
                  />
                );
              }
              const point = cluster.properties.point as MasternodeGeoPoint;
              return (
                <NodeMarker
                  key={`n-${point.proTxHash}`}
                  point={point}
                  lng={lng}
                  lat={lat}
                  onClick={handleNodeClick}
                  onShowTooltip={showTooltip}
                  onHideTooltip={hideTooltip}
                />
              );
            })}
          </g>
        </ZoomableGroup>
      </ComposableMap>

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        canReset={canReset}
        zoom={zoom}
        canZoomIn={zoom < MAX_ZOOM - 0.001}
        canZoomOut={zoom > MIN_ZOOM + 0.001}
      />

      {tooltip.kind !== "none" && (
        <MapTooltip tooltip={tooltip} containerHeight={height} />
      )}
    </div>
  );
}

type GeographyFeature = { rsmKey: string; id: string | number };

const CountryShapes = memo(function CountryShapes({
  geographies,
  highlight,
  onSelectCountry,
}: {
  geographies: GeographyFeature[];
  highlight: string | null;
  onSelectCountry?: (code: string | null) => void;
}) {
  const interactive = !!onSelectCountry;
  return (
    <>
      {geographies.map((geo) => {
        const alpha2 = alpha2FromNumeric(geo.id);
        const isHighlighted = !!alpha2 && alpha2 === highlight;
        const style = isHighlighted
          ? interactive
            ? GEO_STYLE_HIGHLIGHTED_BUNDLE
            : GEO_STYLE_HIGHLIGHTED_PASSIVE_BUNDLE
          : interactive
            ? GEO_STYLE_DEFAULT_BUNDLE
            : GEO_STYLE_DEFAULT_PASSIVE_BUNDLE;
        return (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            onClick={() => {
              if (alpha2 && onSelectCountry) onSelectCountry(alpha2);
            }}
            style={style}
          />
        );
      })}
    </>
  );
});

function ViewSync({
  projection,
  viewRef,
  isAnimatingRef,
  width,
  height,
}: {
  projection: GeoProjection;
  viewRef: MutableRefObject<{ center: [number, number]; zoom: number }>;
  isAnimatingRef: MutableRefObject<boolean>;
  width: number;
  height: number;
}) {
  const { x, y, k } = useZoomPanContext();
  useEffect(() => {
    if (isAnimatingRef.current) return;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(k) ||
      k <= 0
    )
      return;
    const cx = (width / 2 - x) / k;
    const cy = (height / 2 - y) / k;
    const inv = projection.invert?.([cx, cy]);
    if (!inv) return;
    if (!Number.isFinite(inv[0]) || !Number.isFinite(inv[1])) return;
    viewRef.current = { center: [inv[0], inv[1]], zoom: k };
  }, [x, y, k, projection, viewRef, isAnimatingRef, width, height]);
  return null;
}

const ClusterMarker = memo(function ClusterMarker({
  cluster,
  lng,
  lat,
  gradientId,
  glowId,
  onClick,
  onShowTooltip,
  onHideTooltip,
}: {
  cluster: ClusterFeature;
  lng: number;
  lat: number;
  gradientId: string;
  glowId: string;
  onClick: (cluster: ClusterFeature) => void;
  onShowTooltip: (
    event: ReactMouseEvent,
    state: Exclude<TooltipState, { kind: "none" }>,
  ) => void;
  onHideTooltip: () => void;
}) {
  const { k } = useZoomPanContext();
  const inv = 1 / Math.max(k, 0.001);
  const props = cluster.properties as {
    total: number;
    enabled: number;
    banned: number;
    other: number;
  };
  const { total, enabled, banned, other } = props;
  const size = 18;
  const fontSize = total >= 1000 ? 9 : total >= 100 ? 10 : 11;
  const payload = useMemo(
    () =>
      ({
        kind: "cluster",
        x: 0,
        y: 0,
        count: total,
        enabled,
        banned,
        other,
      }) as Exclude<TooltipState, { kind: "none" }>,
    [total, enabled, banned, other],
  );
  return (
    <Marker
      coordinates={[lng, lat]}
      onClick={() => onClick(cluster)}
      onMouseEnter={(e) =>
        onShowTooltip(e as unknown as ReactMouseEvent, payload)
      }
      onMouseLeave={onHideTooltip}
      style={MARKER_CURSOR_STYLE}
    >
      <g transform={`scale(${inv})`} style={MARKER_SCALE_STYLE}>
        <circle
          r={size + 2}
          fill={`url(#${gradientId})`}
          opacity={0.22}
          filter={`url(#${glowId})`}
        />
        <circle
          r={size}
          fill={`url(#${gradientId})`}
          opacity={1}
          stroke="var(--card)"
          strokeWidth={2}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--accent-foreground)"
          fontSize={fontSize}
          fontWeight={700}
          style={{ pointerEvents: "none" }}
        >
          {total}
        </text>
      </g>
    </Marker>
  );
});

const NodeMarker = memo(function NodeMarker({
  point,
  lng,
  lat,
  onClick,
  onShowTooltip,
  onHideTooltip,
}: {
  point: MasternodeGeoPoint;
  lng: number;
  lat: number;
  onClick: (point: MasternodeGeoPoint) => void;
  onShowTooltip: (
    event: ReactMouseEvent,
    state: Exclude<TooltipState, { kind: "none" }>,
  ) => void;
  onHideTooltip: () => void;
}) {
  const { k } = useZoomPanContext();
  const inv = 1 / Math.max(k, 0.001);
  const bucket = getMnStatusBucket(point.status);
  const color = STATUS_COLOR[bucket];
  const payload = useMemo(
    () =>
      ({ kind: "node", x: 0, y: 0, point }) as Exclude<
        TooltipState,
        { kind: "none" }
      >,
    [point],
  );
  return (
    <Marker
      coordinates={[lng, lat]}
      onClick={() => onClick(point)}
      onMouseEnter={(e) =>
        onShowTooltip(e as unknown as ReactMouseEvent, payload)
      }
      onMouseLeave={onHideTooltip}
      style={MARKER_CURSOR_STYLE}
    >
      <g transform={`scale(${inv})`} style={MARKER_SCALE_STYLE}>
        <circle
          r={10}
          fill={color}
          opacity={0.18}
          className={bucket === "enabled" ? "animate-subtle-pulse" : undefined}
        />
        <circle r={4} fill={color} stroke="var(--card)" strokeWidth={1.25} />
      </g>
    </Marker>
  );
});

const MapControls = memo(function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  canReset,
  canZoomIn,
  canZoomOut,
  zoom,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canReset: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoom: number;
}) {
  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-card/90 p-1 shadow-card backdrop-blur">
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom in"
        disabled={!canZoomIn}
        className={cn(
          "grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          !canZoomIn &&
            "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
        )}
      >
        <Plus className="size-4" />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom out"
        disabled={!canZoomOut}
        className={cn(
          "grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          !canZoomOut &&
            "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
        )}
      >
        <Minus className="size-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset view"
        disabled={!canReset}
        className={cn(
          "grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          !canReset &&
            "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
        )}
      >
        <RotateCcw className="size-3.5" />
      </button>
      <div className="px-1 pb-1 pt-0.5 text-center font-mono text-[10px] tabular-nums text-muted-foreground">
        {zoom.toFixed(1)}×
      </div>
    </div>
  );
});

function MapTooltip({
  tooltip,
  containerHeight,
}: {
  tooltip: Exclude<TooltipState, { kind: "none" }>;
  containerHeight: number;
}) {
  const flipY = tooltip.y > containerHeight - 140;
  const transform = flipY
    ? "translate(-50%, calc(-100% - 12px))"
    : "translate(-50%, 12px)";
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[260px] rounded-xl border border-border/60 bg-card/95 px-3 py-2 text-xs shadow-floating backdrop-blur"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform,
      }}
    >
      {tooltip.kind === "cluster" ? (
        <div className="flex flex-col gap-1">
          <div className="font-medium text-sm">
            {tooltip.count} masternodes in this region
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-muted-foreground">
            <span className="flex items-center gap-1">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: "var(--success)" }}
              />
              {tooltip.enabled}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: "var(--destructive)" }}
              />
              {tooltip.banned}
            </span>
            {tooltip.other > 0 && (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: "var(--muted-foreground)" }}
                />
                {tooltip.other}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground/80">
            Click to zoom in
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="font-mono text-sm font-medium">
            {tooltip.point.ipv4}
          </div>
          <div className="text-muted-foreground">
            {formatLocation(tooltip.point)}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{
                background:
                  STATUS_COLOR[getMnStatusBucket(tooltip.point.status)],
              }}
            />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {tooltip.point.status} · {tooltip.point.type}
            </span>
          </div>
          <div className="pt-1 font-mono text-[10px] text-muted-foreground/80">
            {tooltip.point.proTxHash.slice(0, 18)}…
          </div>
        </div>
      )}
    </div>
  );
}
