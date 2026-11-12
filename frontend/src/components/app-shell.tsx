import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import ClassicShell from "@/themes/dash/Shell";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname.startsWith("/og/")) {
    return <>{children}</>;
  }

  return <ClassicShell>{children}</ClassicShell>;
}
