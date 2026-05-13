import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { KeyboardShortcuts } from "@/lib/use-keyboard-nav";
import { MobileTabbar } from "@/themes/neo/components/mobile-tabbar";
import SiteFooter from "@/themes/neo/components/site-footer";
import SiteHeader from "@/themes/neo/components/site-header";

function PageTransitionMain({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <main className="flex-1">
      <div key={pathname} className="animate-page-enter">
        {children}
      </div>
    </main>
  );
}

export default function RedesignShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <PageTransitionMain>{children}</PageTransitionMain>
        <SiteFooter />
      </div>
      <MobileTabbar />
      <KeyboardShortcuts />
    </>
  );
}
