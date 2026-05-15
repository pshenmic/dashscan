import type { ApiVOut } from "@/lib/api/types";

export const DUFFS_PER_DASH = 100_000_000;

export function formatDash(duffs: number): string {
  const dash = duffs / DUFFS_PER_DASH;
  if (dash >= 1) return `${dash.toFixed(2)} DASH`;
  return `${dash.toFixed(4)} DASH`;
}

export function sumVOut(vOut: ApiVOut[] | undefined | null): number {
  if (!vOut) return 0;
  return vOut.reduce((sum, out) => sum + (out.value ?? 0), 0);
}

export function formatDuffs(duffs: number, decimals = 8): string {
  return (duffs / DUFFS_PER_DASH).toFixed(decimals);
}

export function formatCompactUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)} B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)} M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)} K`;
  return `$${value.toFixed(2)}`;
}

export function formatCompactUsdShort(value: number): string {
  if (value >= 1_000_000_000) return `$${Math.round(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export function getMnTypeBadgeStyle(type: string): string {
  const t = type.toLowerCase();
  if (t === "evo" || t === "evolution" || t === "highperformance") {
    return "border-accent bg-[#4C7EFF1F] text-accent";
  }
  return "border-border bg-muted/50 text-muted-foreground";
}

export function getMnTypeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t === "evo" || t === "highperformance") return "Evolution";
  if (t === "regular") return "Regular";
  return type;
}

export function getMnStatusBadgeStyle(status: string): string {
  const s = status.toUpperCase();
  if (s === "ENABLED") return "border-accent bg-[#4C7EFF1F] text-accent";
  if (s.includes("BANNED")) return "border-red-500 bg-red-500/12 text-red-500";
  return "border-border bg-muted/50 text-muted-foreground";
}

export function getMnStatusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "ENABLED") return "Enabled";
  if (s.includes("BANNED")) return "Banned";
  return status;
}

export type MnStatusBucket = "enabled" | "banned" | "other";
export type MnTypeBucket = "regular" | "evo";

export function getMnStatusBucket(status: string): MnStatusBucket {
  const s = status.toUpperCase();
  if (s === "ENABLED") return "enabled";
  if (s.includes("BANNED")) return "banned";
  return "other";
}

export function getMnTypeBucket(type: string): MnTypeBucket {
  const t = type.toLowerCase();
  return t === "evo" || t === "evolution" || t === "highperformance"
    ? "evo"
    : "regular";
}

export function getIp(address: string): string {
  const idx = address.lastIndexOf(":");
  return idx > 0 ? address.slice(0, idx) : address;
}

export function highlightJson(obj: unknown): string {
  const raw = JSON.stringify(obj, null, 2);
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /("(?:\\.|[^"\\])*")\s*(:)?|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, str, colon, bool, num) => {
      if (str && colon) return `<span class="text-foreground">${str}</span>:`;
      if (str) return `<span class="text-emerald-600">${str}</span>`;
      if (bool) return `<span class="text-accent">${match}</span>`;
      if (num) return `<span class="text-accent">${match}</span>`;
      return match;
    },
  );
}

const TX_TYPE_LABELS: Record<number, string> = {
  0: "Asset Transfer",
  1: "Provider Register",
  2: "Provider Update Service",
  3: "Provider Update Registrar",
  4: "Provider Update Revoke",
  5: "Coinbase",
  6: "Quorum Commitment",
  7: "Future",
  8: "Asset Lock",
  9: "Asset Unlock",
};

export function getTxTypeLabel(type: number): string {
  return TX_TYPE_LABELS[type] ?? `Type ${type}`;
}

const TX_TYPE_STYLES: Record<number, string> = {
  0: "border-accent bg-[#4C7EFF1F] text-accent",
  1: "border-violet-500 bg-violet-500/12 text-violet-500",
  2: "border-violet-500 bg-violet-500/12 text-violet-500",
  3: "border-violet-500 bg-violet-500/12 text-violet-500",
  4: "border-red-500 bg-red-500/12 text-red-500",
  5: "border-amber-500 bg-amber-500/12 text-amber-500",
  6: "border-cyan-500 bg-cyan-500/12 text-cyan-500",
  7: "border-slate-500 bg-slate-500/12 text-slate-500",
  8: "border-emerald-500 bg-emerald-500/12 text-emerald-500",
  9: "border-teal-500 bg-teal-500/12 text-teal-500",
};

export function getTxTypeBadgeStyle(type: number): string {
  return (
    TX_TYPE_STYLES[type] ?? "border-slate-500 bg-slate-500/12 text-slate-500"
  );
}

export function formatRelativeTime(timestamp: string | number): string {
  let then: number;
  if (typeof timestamp === "number" || /^\d+$/.test(timestamp)) {
    const unixSeconds = Number(timestamp);
    if (!unixSeconds) return "Never";
    then = unixSeconds * 1000;
  } else {
    then = new Date(timestamp).getTime();
  }
  const diffSeconds = Math.floor((Date.now() - then) / 1000);
  if (diffSeconds < 0) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds} sec. ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min. ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr. ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  if (totalMinutes < 1) return "<1m";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) {
    return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function formatDurationParts(ms: number): {
  value: string;
  unit: string;
} {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  if (totalMinutes < 1) return { value: "<1", unit: "min left" };
  if (totalMinutes < 60)
    return {
      value: String(totalMinutes),
      unit: totalMinutes === 1 ? "min left" : "mins left",
    };
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24)
    return {
      value: String(totalHours),
      unit: totalHours === 1 ? "hr left" : "hrs left",
    };
  const days = Math.floor(totalHours / 24);
  return {
    value: String(days),
    unit: days === 1 ? "day left" : "days left",
  };
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatHashRate(
  hps: string | number | null | undefined,
): string {
  if (hps == null) return "—";
  const n = typeof hps === "number" ? hps : Number(hps);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units: [number, string][] = [
    [1e18, "EH/s"],
    [1e15, "PH/s"],
    [1e12, "TH/s"],
    [1e9, "GH/s"],
    [1e6, "MH/s"],
    [1e3, "kH/s"],
  ];
  for (const [scale, unit] of units) {
    if (n >= scale) return `${(n / scale).toFixed(2)} ${unit}`;
  }
  return `${n.toFixed(0)} H/s`;
}
