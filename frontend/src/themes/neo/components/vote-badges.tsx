import { Minus, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ApiVoteOutcome, ApiVoteSignal } from "@/lib/api/types";
import { Badge } from "@/themes/neo/components/ui/badge";

const SIGNAL_META: Record<
  ApiVoteSignal,
  { label: string; variant: "soft-accent" | "soft-destructive" | "soft" }
> = {
  funding: { label: "Funding", variant: "soft-accent" },
  delete: { label: "Delete", variant: "soft-destructive" },
  endorsed: { label: "Endorsed", variant: "soft" },
  valid: { label: "Valid", variant: "soft" },
};

export function SignalBadge({ signal }: { signal: ApiVoteSignal }) {
  const meta = SIGNAL_META[signal] ?? {
    label: signal,
    variant: "soft" as const,
  };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: ApiVoteOutcome }) {
  if (outcome === "yes") {
    return (
      <Badge variant="soft-success">
        <ThumbsUp className="size-3" /> Yes
      </Badge>
    );
  }
  if (outcome === "no") {
    return (
      <Badge variant="soft-destructive">
        <ThumbsDown className="size-3" /> No
      </Badge>
    );
  }
  return (
    <Badge variant="soft">
      <Minus className="size-3" /> Abstain
    </Badge>
  );
}
