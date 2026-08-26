import { createFileRoute } from "@tanstack/react-router";
import { paginationSearchSchema } from "@/lib/pagination";
import RedesignPeersListPage from "@/themes/neo/pages/peers";

export const Route = createFileRoute("/peers/")({
  validateSearch: paginationSearchSchema,
  component: PeersListRoute,
  head: () => ({
    meta: [{ title: "Peers | Dashscan" }],
  }),
});

function PeersListRoute() {
  return <RedesignPeersListPage />;
}
