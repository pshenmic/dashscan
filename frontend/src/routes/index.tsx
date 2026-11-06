import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { prefetchHome } from "@/lib/home";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignDashboardPage from "@/themes/neo/pages/dashboard";

const HomePage = lazy(() => import("@/themes/dash/pages/home"));

export const Route = createFileRoute("/")({
  component: HomeRoute,
  head: () => ({ meta: [{ title: "Home | Dashscan" }] }),
  loader: ({ context }) => prefetchHome(context.queryClient),
});

function HomeRoute() {
  const theme = useActiveTheme();
  if (theme === "neo") return <RedesignDashboardPage />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <HomePage />
    </Suspense>
  );
}
