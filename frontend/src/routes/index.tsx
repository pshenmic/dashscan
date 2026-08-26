import { createFileRoute } from "@tanstack/react-router";
import { useActiveTheme } from "@/themes/active";
import ClassicDashboardPage from "@/themes/dash/pages/dashboard";
import RedesignDashboardPage from "@/themes/neo/pages/dashboard";

export const Route = createFileRoute("/")({
  component: DashboardRoute,
  head: () => ({
    meta: [{ title: "Dashboard | Dashscan" }],
  }),
});

function DashboardRoute() {
  const theme = useActiveTheme();
  if (theme === "neo") return <RedesignDashboardPage />;
  return <ClassicDashboardPage />;
}
