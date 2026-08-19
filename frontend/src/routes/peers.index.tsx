import { createFileRoute } from "@tanstack/react-router";
import { allPeersQueryOptions } from "@/lib/api/peers";
import { paginationSearchSchema } from "@/lib/pagination";
import { defaultNetwork } from "@/lib/store";
import RedesignPeersListPage from "@/themes/neo/pages/peers";

export const Route = createFileRoute("/peers/")({
  validateSearch: paginationSearchSchema,
  component: PeersListRoute,
  head: () => ({
    meta: [{ title: "Peers | Dashscan" }],
  }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return context.queryClient.prefetchQuery(allPeersQueryOptions({ network }));
  },
});

function PeersListRoute() {
  return <RedesignPeersListPage />;
}
