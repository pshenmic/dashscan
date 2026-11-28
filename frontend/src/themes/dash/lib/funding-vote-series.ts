export const fundingVoteSeries = {
  yes: { label: "Yes", color: "var(--chart-5)" },
  no: {
    label: "No",
    color: "color-mix(in srgb, var(--muted-foreground) 85%, var(--chart-1))",
  },
  abstain: {
    label: "Abstain",
    color: "color-mix(in srgb, var(--foreground) 32%, var(--card))",
  },
} as const;
