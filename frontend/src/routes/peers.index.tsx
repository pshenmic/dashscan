import { createFileRoute } from "@tanstack/react-router";
import { allPeersQueryOptions } from "@/lib/api/peers";
import { paginationSearchSchema } from "@/lib/pagination";
import { prefetchSsrData } from "@/lib/ssr-prefetch";
import { defaultNetwork } from "@/lib/store";
import RedesignPeersListPage from "@/themes/neo/pages/peers";

export const Route = createFileRoute("/peers/")({
  validateSearch: paginationSearchSchema,
  component: PeersListRoute,
  head: () => ({
    meta: [{ title: "Peers | Dashscan" }],
  }),
  loader: ({ context }) =>
    prefetchSsrData(context.queryClient, [
      () =>
        context.queryClient.prefetchQuery(
          allPeersQueryOptions({ network: defaultNetwork }),
        ),
    ]),
});

function PeersListRoute() {
  return <RedesignPeersListPage />;
}
