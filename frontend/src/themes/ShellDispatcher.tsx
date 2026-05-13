import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import ClassicShell from "@/themes/dash/Shell";
import RedesignShell from "@/themes/neo/Shell";
import { useActiveTheme } from "./active";

export function ThemeShell({ children }: { children: ReactNode }) {
  const theme = useActiveTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname.startsWith("/og/")) {
    return <>{children}</>;
  }

  if (theme === "neo") {
    return <RedesignShell>{children}</RedesignShell>;
  }

  return <ClassicShell>{children}</ClassicShell>;
}
