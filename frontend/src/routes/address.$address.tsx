import { createFileRoute } from "@tanstack/react-router";
import {
  addressBalanceChartQueryOptions,
  addressQueryOptions,
  addressTransactionsInfiniteQueryOptions,
  addressTransactionsQueryOptions,
} from "@/lib/api/addresses";
import { paginationSearchSchema } from "@/lib/pagination";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicAddressDetailPage from "@/themes/dash/pages/address-detail";
import RedesignAddressDetailPage from "@/themes/neo/pages/address-detail";

const REDESIGN_PAGE_SIZE = 25;

function getMonthRangeBounds() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    timestampStart: start.toISOString(),
    timestampEnd: end.toISOString(),
  };
}

export const Route = createFileRoute("/address/$address")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: AddressDetailRoute,
  head: ({ params }) => ({
    meta: [
      { title: `Address ${params.address.slice(0, 12)}... | DashScan` },
      {
        property: "og:title",
        content: `Address ${params.address.slice(0, 12)}…`,
      },
      { property: "og:image", content: `/og/address/${params.address}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `/og/address/${params.address}` },
    ],
  }),
  loader: async ({ context, params: { address }, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    const range = getMonthRangeBounds();
    await Promise.allSettled([
      context.queryClient.prefetchQuery(
        addressQueryOptions({ network, address }),
      ),
      context.queryClient.prefetchQuery(
        addressTransactionsQueryOptions({
          network,
          address,
          page,
          limit,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchInfiniteQuery(
        addressTransactionsInfiniteQueryOptions({
          network,
          address,
          limit: REDESIGN_PAGE_SIZE,
          order: "desc",
        }),
      ),
      context.queryClient.prefetchQuery(
        addressBalanceChartQueryOptions({ network, address, ...range }),
      ),
    ]);
  },
});

function AddressDetailRoute() {
  const theme = useActiveTheme();
  const { address } = Route.useParams();
  const { page, limit } = Route.useSearch();
  if (theme === "neo") return <RedesignAddressDetailPage address={address} />;
  return (
    <ClassicAddressDetailPage address={address} page={page} limit={limit} />
  );
}
