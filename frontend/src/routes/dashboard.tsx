import { createFileRoute } from "@tanstack/react-router";
import { prefetchDashboard, statisticsSearch } from "@/lib/dashboard";
import DashboardPage from "@/themes/DashboardPage";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Network statistics | Dashscan" }] }),
  validateSearch: statisticsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => prefetchDashboard(context.queryClient, deps),
});
