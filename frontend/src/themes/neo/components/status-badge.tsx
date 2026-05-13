import { getMnStatusLabel, getMnTypeLabel, getTxTypeLabel } from "@/lib/format";
import { Badge } from "@/themes/neo/components/ui/badge";

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

const TX_TYPE_CLASSES: Record<number, string> = {
  0: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-300",
  1: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:bg-violet-400/10 dark:text-violet-300",
  2: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-400/10 dark:text-indigo-300",
  3: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-300",
  4: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-400/10 dark:text-red-300",
  5: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-300",
  6: "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:bg-teal-400/10 dark:text-teal-300",
  7: "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300",
  8: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  9: "bg-lime-500/10 text-lime-700 border-lime-500/20 dark:bg-lime-400/10 dark:text-lime-300",
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
  const cls = TX_TYPE_CLASSES[type];
  if (cls) {
    return (
      <Badge variant="outline" className={cls}>
        {getTxTypeLabel(type)}
      </Badge>
    );
  }
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
  locked: boolean | string | null | undefined;
}

export function InstantLockBadge({ locked }: InstantLockBadgeProps) {
  const isLocked =
    typeof locked === "string" ? locked.length > 0 : Boolean(locked);
  return isLocked ? (
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
