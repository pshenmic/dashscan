import { Badge } from "@/components/ui/badge";
import { getMnStatusLabel, getMnTypeLabel, getTxTypeLabel } from "@/lib/format";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "accent"
  | "soft"
  | "soft-accent"
  | "soft-success"
  | "soft-destructive";

const TX_TYPE_VARIANTS: Record<number, BadgeVariant> = {
  0: "soft-accent",
  1: "soft",
  2: "soft",
  3: "soft",
  4: "soft-destructive",
  5: "soft",
  6: "soft",
  7: "soft",
  8: "soft-success",
  9: "soft-success",
};

export function getMnStatusVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === "ENABLED") return "soft-success";
  if (s.includes("BANNED")) return "soft-destructive";
  return "soft";
}

export function getMnTypeVariant(type: string): BadgeVariant {
  const t = type.toLowerCase();
  if (t === "evo" || t === "evolution" || t === "highperformance") {
    return "soft-accent";
  }
  return "soft";
}

export function getTxTypeVariant(type: number): BadgeVariant {
  return TX_TYPE_VARIANTS[type] ?? "soft";
}

interface TxTypeBadgeProps {
  type: number;
}

export function TxTypeBadge({ type }: TxTypeBadgeProps) {
  return <Badge variant={getTxTypeVariant(type)}>{getTxTypeLabel(type)}</Badge>;
}

interface MnStatusBadgeProps {
  status: string;
}

export function MnStatusBadge({ status }: MnStatusBadgeProps) {
  return (
    <Badge variant={getMnStatusVariant(status)}>
      {getMnStatusLabel(status)}
    </Badge>
  );
}

interface MnTypeBadgeProps {
  type: string;
}

export function MnTypeBadge({ type }: MnTypeBadgeProps) {
  return <Badge variant={getMnTypeVariant(type)}>{getMnTypeLabel(type)}</Badge>;
}

interface InstantLockBadgeProps {
  locked: boolean | null | undefined;
}

export function InstantLockBadge({ locked }: InstantLockBadgeProps) {
  return locked ? (
    <Badge variant="soft-success">InstantSend</Badge>
  ) : (
    <Badge variant="soft">Pending</Badge>
  );
}

interface ChainLockBadgeProps {
  locked: boolean | null | undefined;
}

export function ChainLockBadge({ locked }: ChainLockBadgeProps) {
  return locked ? <Badge variant="soft-accent">Chain Locked</Badge> : null;
}

interface ConfirmationsBadgeProps {
  confirmations: number;
}

export function ConfirmationsBadge({ confirmations }: ConfirmationsBadgeProps) {
  if (confirmations === 0) return <Badge variant="soft">Unconfirmed</Badge>;
  return (
    <Badge variant="soft-success">
      {confirmations.toLocaleString()}{" "}
      {confirmations === 1 ? "confirm" : "confirms"}
    </Badge>
  );
}
