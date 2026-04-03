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

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}
