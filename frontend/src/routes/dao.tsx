import { createFileRoute } from "@tanstack/react-router";
import { blocksQueryOptions } from "@/lib/api/blocks";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import {
  budgetQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import { defaultNetwork } from "@/lib/store";
import { useActiveTheme } from "@/themes/active";
import ClassicDaoPage from "@/themes/dash/pages/dao";
import RedesignDaoPage from "@/themes/neo/pages/dao";

export const Route = createFileRoute("/dao")({
  component: DaoRoute,
  head: () => ({
    meta: [{ title: "DAO | Dashscan" }],
  }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        proposalsQueryOptions({ network, proposalType: "all" }),
      ),
      context.queryClient.prefetchQuery(budgetQueryOptions({ network })),
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page: 1, limit: 1 }),
      ),
      context.queryClient.prefetchQuery(chainStatsQueryOptions({ network })),
    ]);
  },
});

function DaoRoute() {
  const theme = useActiveTheme();
  if (theme === "neo") return <RedesignDaoPage />;
  return <ClassicDaoPage />;
}
