import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { paginationSearchSchema } from "@/lib/pagination";
import { useActiveTheme } from "@/themes/active";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";
import RedesignAddressDetailPage from "@/themes/neo/pages/address-detail";

const ClassicAddressDetailPage = lazy(
  () => import("@/themes/dash/pages/address-detail"),
);

export const Route = createFileRoute("/address/$address")({
  validateSearch: paginationSearchSchema,
  component: AddressDetailRoute,
  head: ({ params }) => ({
    meta: [
      { title: `Address ${params.address.slice(0, 12)}... | Dashscan` },
      {
        property: "og:title",
        content: `Address ${params.address.slice(0, 12)}…`,
      },
      { property: "og:image", content: `/og/address/${params.address}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `/og/address/${params.address}` },
    ],
  }),
});

function AddressDetailRoute() {
  const theme = useActiveTheme();
  const { address } = Route.useParams();
  const { page, limit } = Route.useSearch();
  if (theme === "neo") return <RedesignAddressDetailPage address={address} />;
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicAddressDetailPage address={address} page={page} limit={limit} />
    </Suspense>
  );
}
