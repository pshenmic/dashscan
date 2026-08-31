import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAddressActivityWindowBounds } from "@/lib/address-activity-window";
import {
  addressesActivityInfiniteQueryOptions,
  richListInfiniteQueryOptions,
} from "@/lib/api/addresses";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import RedesignAddressesPage from "@/themes/neo/pages/addresses";

const addressesSearchSchema = z.object({
  tab: z.enum(["active", "rich"]).optional().catch(undefined),
  window: z.enum(["24h", "3d", "7d", "30d"]).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/addresses")({
  component: AddressesRoute,
  validateSearch: addressesSearchSchema,
  loaderDeps: ({ search: { tab, window } }) => ({
    tab: tab ?? "active",
    window: window ?? "24h",
  }),
  head: () => ({
    meta: [{ title: "Addresses | Dashscan" }],
  }),
  loader: ({ context, deps: { tab, window } }) =>
    prefetchSsrData(context.queryClient, [
      tab === "active"
        ? () =>
            context.queryClient.prefetchInfiniteQuery(
              addressesActivityInfiniteQueryOptions({
                network: defaultNetwork,
                limit: 25,
                order: "desc",
                ...getAddressActivityWindowBounds(window),
              }),
            )
        : () =>
            context.queryClient.prefetchInfiniteQuery(
              richListInfiniteQueryOptions({
                network: defaultNetwork,
                limit: 25,
                order: "desc",
              }),
            ),
    ]),
});

function AddressesRoute() {
  return <RedesignAddressesPage />;
}
