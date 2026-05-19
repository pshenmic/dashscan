import type { MnStatusBucket } from "@/lib/format";

export const STATUS_COLOR: Record<MnStatusBucket, string> = {
  enabled: "var(--success)",
  banned: "var(--destructive)",
  other: "var(--muted-foreground)",
};

export const STATUS_SORT_ORDER: Record<MnStatusBucket, number> = {
  enabled: 0,
  other: 1,
  banned: 2,
};
