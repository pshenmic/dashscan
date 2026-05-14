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

export function useSuperclusterIndex(points: MasternodeGeoPoint[]) {
  return useMemo(() => {
    const index = new Supercluster<ClusterProps, ClusterAggregate>({
      radius: 48,
      maxZoom: 8,
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

export function mapZoomToSuperZoom(mapZoom: number, maxZoom = 8): number {
  if (mapZoom <= 1) return 1;
  const z = Math.round(Math.log2(mapZoom) * 1.5 + 1);
  return Math.max(0, Math.min(maxZoom, z));
}
