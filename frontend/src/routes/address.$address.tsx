import { createFileRoute } from "@tanstack/react-router";
import {
  addressBalanceChartQueryOptions,
  addressQueryOptions,
  addressTransactionsQueryOptions,
} from "@/lib/api/addresses";
import { defaultNetwork } from "@/lib/store";
import { paginationSearchSchema } from "@/themes/classic/lib/pagination";
import ClassicAddressDetailPage from "@/themes/classic/pages/address-detail";

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
      {
        title: `Address ${params.address.slice(0, 12)}... | DashScan`,
      },
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
      context.queryClient.prefetchQuery(
        addressBalanceChartQueryOptions({ network, address, ...range }),
      ),
    ]);
  },
});

function AddressDetailRoute() {
  const { address } = Route.useParams();
  const { page, limit } = Route.useSearch();
  return (
    <ClassicAddressDetailPage address={address} page={page} limit={limit} />
  );
}
