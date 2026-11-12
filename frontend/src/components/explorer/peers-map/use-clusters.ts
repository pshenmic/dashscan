import { useMemo } from "react";
import Supercluster from "supercluster";
import type { PeerGeoPoint } from "@/lib/api/peers";

export type ClusterProps = {
  point: PeerGeoPoint;
};

export type ClusterAggregate = {
  total: number;
  available: number;
  unavailable: number;
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

export function useSuperclusterIndex(points: PeerGeoPoint[]) {
  return useMemo(() => {
    const index = new Supercluster<ClusterProps, ClusterAggregate>({
      radius: 60,
      maxZoom: SUPERCLUSTER_MAX_ZOOM,
      minPoints: 2,
      map: (props) => ({
        total: 1,
        available: props.point.available ? 1 : 0,
        unavailable: props.point.available ? 0 : 1,
      }),
      reduce: (acc, props) => {
        acc.total += props.total;
        acc.available += props.available;
        acc.unavailable += props.unavailable;
      },
    });
    index.load(
      points.map((p) => ({
        type: "Feature" as const,
        properties: { point: p },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    );
    return index;
  }, [points]);
}

export function getClusterLeafPoints(
  index: SuperclusterIndex,
  clusterId: number,
): PeerGeoPoint[] {
  return index.getLeaves(clusterId, Infinity).map((f) => f.properties.point);
}

export function mapZoomToSuperZoom(mapZoom: number): number {
  if (mapZoom <= 1) return 1;
  const z = Math.round(Math.log2(mapZoom) * MAP_TO_SUPER_ZOOM_SLOPE + 1);
  return Math.max(0, Math.min(SUPERCLUSTER_MAX_ZOOM + 1, z));
}

export function superZoomToMapZoom(superZoom: number): number {
  return 2 ** ((superZoom - 1) / MAP_TO_SUPER_ZOOM_SLOPE);
}
