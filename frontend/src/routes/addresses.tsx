import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { richListQueryOptions } from "@/lib/api/addresses";
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
  head: () => ({
    meta: [{ title: "Addresses | Dashscan" }],
  }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    return context.queryClient.prefetchQuery(
      richListQueryOptions({
        network: defaultNetwork,
        page: 1,
        limit: 25,
        order: "desc",
      }),
    );
  },
});

function AddressesRoute() {
  return <RedesignAddressesPage />;
}
