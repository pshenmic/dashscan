import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { addressQueryOptions } from "@/lib/api/addresses";
import { paginationSearchSchema } from "@/lib/pagination";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";

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
  loader: ({ context, params: { address } }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchQuery(
          addressQueryOptions({ network: defaultNetwork, address }),
        ),
    ]),
});

function AddressDetailRoute() {
  const { address } = Route.useParams();
  const { page, limit } = Route.useSearch();
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <ClassicAddressDetailPage address={address} page={page} limit={limit} />
    </Suspense>
  );
}
