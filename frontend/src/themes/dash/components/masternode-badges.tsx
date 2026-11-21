import { Badge } from "@/components/ui/badge";
import { getMnStatusLabel, getMnTypeLabel } from "@/lib/format";

export function MasternodeTypeBadge({ type }: { type: string }) {
  const label = getMnTypeLabel(type);
  return (
    <Badge
      variant="outline"
      className={`h-6 px-2 py-0 ${label === "Evonode" ? "border-brand/20 bg-action-subtle text-accent" : "border-border bg-foreground/4 text-muted-foreground"}`}
    >
      {label}
    </Badge>
  );
}

export function MasternodeStatusBadge({ status }: { status: string }) {
  const value = status.toUpperCase();
  const colors =
    value === "ENABLED"
      ? "border-success/20 bg-positive-brand/12 text-success"
      : value.includes("BANNED")
        ? "border-destructive/20 bg-destructive/12 text-destructive"
        : "border-border bg-foreground/4 text-muted-foreground";
  return (
    <Badge variant="outline" className={`h-6 px-2 py-0 ${colors}`}>
      {getMnStatusLabel(status)}
    </Badge>
  );
}
