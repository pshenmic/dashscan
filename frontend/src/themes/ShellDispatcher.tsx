import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import ClassicShell from "@/themes/classic/Shell";
import RedesignShell from "@/themes/redesign/Shell";
import { useActiveTheme } from "./active";

export function ThemeShell({ children }: { children: ReactNode }) {
  const theme = useActiveTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname.startsWith("/og/")) {
    return <>{children}</>;
  }

  if (theme === "redesign") {
    return <RedesignShell>{children}</RedesignShell>;
  }

  return <ClassicShell>{children}</ClassicShell>;
}
