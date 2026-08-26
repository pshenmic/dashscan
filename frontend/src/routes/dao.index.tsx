import { createFileRoute } from "@tanstack/react-router";
import { useActiveTheme } from "@/themes/active";
import ClassicDaoPage from "@/themes/dash/pages/dao";
import RedesignDaoPage from "@/themes/neo/pages/dao";

export const Route = createFileRoute("/dao/")({
  component: DaoRoute,
  head: () => ({
    meta: [{ title: "DAO | Dashscan" }],
  }),
});

function DaoRoute() {
  const theme = useActiveTheme();
  if (theme === "neo") return <RedesignDaoPage />;
  return <ClassicDaoPage />;
}
