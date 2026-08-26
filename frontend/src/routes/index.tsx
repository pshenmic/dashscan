import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignDashboardPage from "@/themes/neo/pages/dashboard";

const ClassicDashboardPage = lazy(
  () => import("@/themes/dash/pages/dashboard"),
);

export const Route = createFileRoute("/")({
  component: DashboardRoute,
  head: () => ({
    meta: [{ title: "Dashboard | Dashscan" }],
  }),
});

function DashboardRoute() {
  const theme = useActiveTheme();
  if (theme === "neo") return <RedesignDashboardPage />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicDashboardPage />
    </Suspense>
  );
}
