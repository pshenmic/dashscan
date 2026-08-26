import { createFileRoute } from "@tanstack/react-router";
import { paginationSearchSchema } from "@/lib/pagination";
import { useActiveTheme } from "@/themes/active";
import ClassicMasternodesListPage from "@/themes/dash/pages/masternodes-list";
import RedesignMasternodesListPage from "@/themes/neo/pages/masternodes-list";

export const Route = createFileRoute("/masternodes/")({
  validateSearch: paginationSearchSchema,
  component: MasternodesListRoute,
  head: () => ({
    meta: [{ title: "Masternodes | Dashscan" }],
  }),
});

function MasternodesListRoute() {
  const theme = useActiveTheme();
  const { page, limit } = Route.useSearch();
  if (theme === "neo") return <RedesignMasternodesListPage />;
  return <ClassicMasternodesListPage page={page} limit={limit} />;
}
