import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";
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
      {isHome && (
        <div
          aria-hidden="true"
          className="dash-home-grid-surface pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-full max-w-[1440px] -translate-x-1/2 overflow-hidden"
        >
          <div
            className="absolute bottom-0 left-1/2 h-[1132px] w-[1440px] -translate-x-1/2 rotate-180 bg-foreground"
            style={{
              mask: "url(/images/home/grid.svg) center / contain no-repeat",
            }}
          />
        </div>
      )}
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
