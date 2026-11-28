import { formatNumber } from "@/lib/format";

export function NetYesBadge({
  value,
  enoughVotes,
  threshold,
}: {
  value: number | null;
  enoughVotes?: boolean | null;
  threshold?: number | null;
}) {
  if (value == null) return "—";
  const met = enoughVotes ?? (threshold == null ? null : value >= threshold);
  const status =
    met == null
      ? "Vote threshold unknown"
      : met
        ? "Vote threshold met"
        : "Below vote threshold";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold tabular-nums ${met ? "bg-positive-brand/12 text-success" : "bg-secondary text-muted-foreground"}`}
      title={status}
    >
      {formatNumber(value)}
      <span className="sr-only"> · {status}</span>
    </span>
  );
}
