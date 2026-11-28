import { createFileRoute, redirect } from "@tanstack/react-router";
import { proposalsAnchor } from "@/lib/governance";

export const Route = createFileRoute("/dao/proposals")({
  beforeLoad: () => {
    throw redirect({ to: "/dao", hash: proposalsAnchor, replace: true });
  },
});
