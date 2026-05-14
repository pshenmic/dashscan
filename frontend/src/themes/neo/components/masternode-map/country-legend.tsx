import { Globe2 } from "lucide-react";
import { useMemo } from "react";
import type { MasternodeGeoPoint } from "@/lib/api/masternodes";
import { getMnStatusBucket } from "@/lib/format";
import { cn } from "@/lib/utils";
import { countryFlagEmoji, countryName } from "./iso-codes";

type CountryRow = {
  code: string;
  total: number;
  enabled: number;
  pct: number;
};

const TOP_N = 6;

export function CountryLegend({
  points,
  total,
  selected,
  onSelect,
}: {
  points: MasternodeGeoPoint[];
  total: number;
  selected?: string | null;
  onSelect?: (code: string | null) => void;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { total: number; enabled: number }>();
    for (const p of points) {
      const code = p.countryCode || "??";
      const e = map.get(code) ?? { total: 0, enabled: 0 };
      e.total += 1;
      if (getMnStatusBucket(p.status) === "enabled") e.enabled += 1;
      map.set(code, e);
    }
    const all: CountryRow[] = Array.from(map.entries())
      .map(([code, v]) => ({
        code,
        total: v.total,
        enabled: v.enabled,
        pct: total > 0 ? (v.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
    return all;
  }, [points, total]);

  const top = rows.slice(0, TOP_N);
  const rest = rows.slice(TOP_N);
  const restTotal = rest.reduce((s, r) => s + r.total, 0);
  const restPct = total > 0 ? (restTotal / total) * 100 : 0;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe2 className="size-4 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Top Countries
          </span>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {rows.length} {rows.length === 1 ? "country" : "countries"}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {top.map((row) => {
          const isSelected = selected === row.code;
          return (
            <li key={row.code}>
              <button
                type="button"
                onClick={() => onSelect?.(isSelected ? null : row.code)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors",
                  "hover:border-border/60 hover:bg-secondary/60",
                  isSelected && "border-accent/40 bg-accent/10",
                )}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {countryFlagEmoji(row.code)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {countryName(row.code)}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-accent">
                      {row.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-violet)] transition-all"
                        style={{ width: `${Math.max(2, row.pct)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {row.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {rest.length > 0 && (
          <li className="mt-1 flex items-center justify-between rounded-xl border border-dashed border-border/60 px-2.5 py-2">
            <span className="text-xs text-muted-foreground">
              + {rest.length} more
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {restTotal} · {restPct.toFixed(1)}%
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
