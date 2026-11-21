import { lazy, Suspense } from "react";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";

const ClassicDashboardPage = lazy(
  () => import("@/themes/dash/pages/dashboard"),
);

export default function DashboardPage() {
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicDashboardPage />
    </Suspense>
  );
}
