import { Link } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { useMemo } from "react";
import type { MasternodeGeoPoint } from "@/lib/api/masternodes";
import { getMnStatusBucket, type MnStatusBucket } from "@/lib/format";
import { cn } from "@/lib/utils";
import { countryFlagEmoji, formatLocation } from "./iso-codes";
import { STATUS_COLOR, STATUS_SORT_ORDER } from "./status";

export function ClusterList({
  leaves,
  maxHeight,
}: {
  leaves: MasternodeGeoPoint[];
  maxHeight: number;
}) {
  const annotated = useMemo(
    () =>
      leaves.map((point) => ({
        point,
        bucket: getMnStatusBucket(point.status),
      })),
    [leaves],
  );

  const sorted = useMemo(() => {
    return [...annotated].sort((a, b) => {
      if (a.bucket !== b.bucket) {
        return STATUS_SORT_ORDER[a.bucket] - STATUS_SORT_ORDER[b.bucket];
      }
      return a.point.proTxHash.localeCompare(b.point.proTxHash);
    });
  }, [annotated]);

  const summary = useMemo(() => {
    const counts: Record<MnStatusBucket, number> = {
      enabled: 0,
      banned: 0,
      other: 0,
    };
    for (const { bucket } of annotated) counts[bucket] += 1;
    return counts;
  }, [annotated]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-muted-foreground" />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Cluster Masternodes
        </span>
      </div>
      <div className="flex items-center gap-3 px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: STATUS_COLOR.enabled }}
          />
          {summary.enabled}
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: STATUS_COLOR.banned }}
          />
          {summary.banned}
        </span>
        {summary.other > 0 && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: STATUS_COLOR.other }}
            />
            {summary.other}
          </span>
        )}
      </div>
      <ul
        className="flex flex-col gap-1 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {sorted.map(({ point, bucket }) => (
          <li key={point.proTxHash}>
            <Link
              to="/masternodes/$hash"
              params={{ hash: point.proTxHash }}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors",
                "hover:border-border/60 hover:bg-secondary/60",
              )}
            >
              <span
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ background: STATUS_COLOR[bucket] }}
                aria-hidden="true"
              />
              <span className="text-sm leading-none" aria-hidden="true">
                {countryFlagEmoji(point.countryCode)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-mono text-xs">{point.ipv4}</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {formatLocation(point)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
