import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { getAddressActivityWindowBounds } from "@/lib/address-activity-window";
import {
  addressesActivityInfiniteQueryOptions,
  richListInfiniteQueryOptions,
} from "@/lib/api/addresses";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import { LazyThemePageFallback } from "@/themes/LazyThemeFallback";

const DashAddressesPage = lazy(() => import("@/themes/dash/pages/addresses"));

const addressesSearchSchema = z.object({
  tab: z.enum(["active", "rich"]).optional().catch(undefined),
  window: z.enum(["24h", "3d", "7d", "30d"]).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
  limit: z
    .union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
    .optional()
    .catch(undefined),
  order: z.enum(["asc", "desc"]).optional().catch(undefined),
  view: z.enum(["pagination", "infinite"]).optional().catch(undefined),
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
  return (
    <Suspense fallback={<LazyThemePageFallback />}>
      <DashAddressesPage />
    </Suspense>
  );
}
