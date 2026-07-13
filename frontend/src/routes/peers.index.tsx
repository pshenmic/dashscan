import { createFileRoute } from "@tanstack/react-router";
import { allPeersQueryOptions, peersQueryOptions } from "@/lib/api/peers";
import { paginationSearchSchema } from "@/lib/pagination";
import { defaultNetwork } from "@/lib/store";
import RedesignPeersListPage from "@/themes/neo/pages/peers";

export const Route = createFileRoute("/peers/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: PeersListRoute,
  head: () => ({
    meta: [{ title: "Peers | Dashscan" }],
  }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        peersQueryOptions({ network, page, limit, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(allPeersQueryOptions({ network })),
    ]);
  },
});

function PeersListRoute() {
  return <RedesignPeersListPage />;
}
