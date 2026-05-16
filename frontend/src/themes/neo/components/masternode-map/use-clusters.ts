import { useMemo } from "react";
import Supercluster from "supercluster";
import type { MasternodeGeoPoint } from "@/lib/api/masternodes";
import { getMnStatusBucket } from "@/lib/format";

export type ClusterProps = {
  point: MasternodeGeoPoint;
};

export type ClusterAggregate = {
  total: number;
  enabled: number;
  banned: number;
  other: number;
};

export type SuperclusterIndex = Supercluster<ClusterProps, ClusterAggregate>;

export type ClusterFeature = ReturnType<
  SuperclusterIndex["getClusters"]
>[number];

export function isCluster(f: ClusterFeature): f is ClusterFeature & {
  properties: { cluster: true } & ClusterAggregate & {
      cluster_id: number;
      point_count: number;
    };
} {
  return Boolean((f.properties as { cluster?: boolean }).cluster);
}

export const SUPERCLUSTER_MAX_ZOOM = 18;
export const MAP_TO_SUPER_ZOOM_SLOPE = 2.2;

const COLOC_BUCKET_DEG = 1.0;
const COLOC_SPREAD_RADIUS_DEG = 2.5;
const COLOC_MIN_STEP_DEG = 0.25;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function jitterColocated(points: MasternodeGeoPoint[]): MasternodeGeoPoint[] {
  const groups = new Map<string, MasternodeGeoPoint[]>();
  const bucketScale = 1 / COLOC_BUCKET_DEG;
  for (const p of points) {
    const bx = Math.round(p.lng * bucketScale);
    const by = Math.round(p.lat * bucketScale);
    const key = `${by},${bx}`;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  const out: MasternodeGeoPoint[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    group.sort((a, b) => a.proTxHash.localeCompare(b.proTxHash));
    const centerLat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const centerLng = group.reduce((s, p) => s + p.lng, 0) / group.length;
    const step = Math.max(
      COLOC_MIN_STEP_DEG,
      COLOC_SPREAD_RADIUS_DEG / Math.sqrt(group.length),
    );
    const invCosLat = 1 / Math.max(0.1, Math.cos((centerLat * Math.PI) / 180));
    for (let i = 0; i < group.length; i++) {
      const r = Math.sqrt(i) * step;
      const angle = i * GOLDEN_ANGLE;
      const p = group[i];
      out.push({
        ...p,
        lat: centerLat + r * Math.sin(angle),
        lng: centerLng + r * Math.cos(angle) * invCosLat,
      });
    }
  }
  return out;
}

export function useSuperclusterIndex(points: MasternodeGeoPoint[]) {
  return useMemo(() => {
    const index = new Supercluster<ClusterProps, ClusterAggregate>({
      radius: 75,
      maxZoom: SUPERCLUSTER_MAX_ZOOM,
      minPoints: 2,
      map: (props) => {
        const bucket = getMnStatusBucket(props.point.status);
        return {
          total: 1,
          enabled: bucket === "enabled" ? 1 : 0,
          banned: bucket === "banned" ? 1 : 0,
          other: bucket === "other" ? 1 : 0,
        };
      },
      reduce: (acc, props) => {
        acc.total += props.total;
        acc.enabled += props.enabled;
        acc.banned += props.banned;
        acc.other += props.other;
      },
    });
    const prepared = jitterColocated(points);
    index.load(
      prepared.map((p) => ({
        type: "Feature" as const,
        properties: { point: p },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    );
    return index;
  }, [points]);
}

export function mapZoomToSuperZoom(mapZoom: number): number {
  if (mapZoom <= 1) return 1;
  const z = Math.round(Math.log2(mapZoom) * MAP_TO_SUPER_ZOOM_SLOPE + 1);
  return Math.max(0, Math.min(SUPERCLUSTER_MAX_ZOOM + 1, z));
}

export function superZoomToMapZoom(superZoom: number): number {
  return 2 ** ((superZoom - 1) / MAP_TO_SUPER_ZOOM_SLOPE);
}
