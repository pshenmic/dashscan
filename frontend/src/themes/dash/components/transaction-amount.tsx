import { metricDuffs } from "@/themes/dash/lib/home-metrics";

export function TransactionAmount({ value }: { value: number | null }) {
  return value === null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span className="tabular-nums">
      {metricDuffs(value)}{" "}
      <span className="text-xs font-medium text-muted-foreground">DASH</span>
    </span>
  );
}
