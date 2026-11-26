import { formatNumber } from "@/lib/format";

const tones = {
  Yes: "border-action-subtle bg-action-subtle",
  No: "border-border bg-foreground/12",
  Abstain: "border-border bg-secondary text-muted-foreground",
};

export function VoteBadge({
  outcome,
  children,
}: {
  outcome: keyof typeof tones;
  children: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold tabular-nums ${tones[outcome]}`}
    >
      {children}
    </span>
  );
}

export function VoteCountBadge({
  outcome,
  value,
}: {
  outcome: keyof typeof tones;
  value: number | null;
}) {
  if (value == null) return "—";
  return <VoteBadge outcome={outcome}>{formatNumber(value)}</VoteBadge>;
}
