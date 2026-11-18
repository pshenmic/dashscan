import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";
import { DashBackground } from "@/themes/dash/components/dash-background";
import Footer from "@/themes/dash/components/footer";
import Header from "@/themes/dash/components/header";

export default function ClassicShell({ children }: { children: ReactNode }) {
  const contentId = useId();
  const isHome = useRouterState({
    select: (state) => state.location.pathname === "/",
  });
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <a
        href={`#${contentId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground focus:outline-2 focus:outline-ring"
      >
        Skip to content
      </a>
      <DashBackground isHome={isHome} />
      <Header />
      <div
        id={contentId}
        tabIndex={-1}
        className={isHome ? "flex-1" : "flex-1 pb-12"}
      >
        {children}
      </div>
      <Footer />
    </div>
  );
}
