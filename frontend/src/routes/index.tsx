import { createFileRoute } from "@tanstack/react-router";
import { prefetchDashboard } from "@/lib/dashboard";
import DashboardPage from "@/themes/DashboardPage";

export const Route = createFileRoute("/")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard | Dashscan" }] }),
  loader: ({ context }) => prefetchDashboard(context.queryClient),
});
