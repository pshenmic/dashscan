import { Layers } from "lucide-react";
import { useMemo } from "react";
import type { PeerGeoPoint } from "@/lib/api/peers";
import { countryFlagEmoji, formatLocation } from "../masternode-map/iso-codes";
import {
  AVAILABILITY_COLOR,
  AVAILABILITY_SORT_ORDER,
  type PeerAvailabilityBucket,
  peerBucket,
} from "./status";

export function ClusterList({
  leaves,
  maxHeight,
}: {
  leaves: PeerGeoPoint[];
  maxHeight: number;
}) {
  const annotated = useMemo(
    () =>
      leaves.map((point) => ({
        point,
        bucket: peerBucket(point.available),
      })),
    [leaves],
  );

  const sorted = useMemo(() => {
    return [...annotated].sort((a, b) => {
      if (a.bucket !== b.bucket) {
        return (
          AVAILABILITY_SORT_ORDER[a.bucket] - AVAILABILITY_SORT_ORDER[b.bucket]
        );
      }
      return a.point.address.localeCompare(b.point.address);
    });
  }, [annotated]);

  const summary = useMemo(() => {
    const counts: Record<PeerAvailabilityBucket, number> = {
      available: 0,
      unavailable: 0,
    };
    for (const { bucket } of annotated) counts[bucket] += 1;
    return counts;
  }, [annotated]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-muted-foreground" />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Cluster Peers
        </span>
      </div>
      <div className="flex items-center gap-3 px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: AVAILABILITY_COLOR.available }}
          />
          {summary.available}
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: AVAILABILITY_COLOR.unavailable }}
          />
          {summary.unavailable}
        </span>
      </div>
      <ul
        className="flex flex-col gap-1 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {sorted.map(({ point, bucket }) => (
          <li
            key={point.address}
            className="flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left"
          >
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ background: AVAILABILITY_COLOR[bucket] }}
              aria-hidden="true"
            />
            <span className="text-sm leading-none" aria-hidden="true">
              {countryFlagEmoji(point.countryCode)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-mono text-xs">
                {point.address}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {point.userAgent || formatLocation(point)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
