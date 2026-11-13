import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { prefetchHome } from "@/lib/home";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";

const HomePage = lazy(() => import("@/themes/dash/pages/home"));

export const Route = createFileRoute("/")({
  component: HomeRoute,
  head: () => ({ meta: [{ title: "Home | Dashscan" }] }),
  loader: ({ context }) => prefetchHome(context.queryClient),
});

function HomeRoute() {
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <HomePage />
    </Suspense>
  );
}
