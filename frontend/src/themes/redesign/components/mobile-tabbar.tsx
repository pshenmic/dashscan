import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  Box,
  LayoutDashboard,
  type LucideIcon,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SpotlightSearch } from "@/themes/redesign/components/spotlight-search";

type TabItem =
  | {
      kind: "link";
      to: string;
      label: string;
      icon: LucideIcon;
      exact: boolean;
    }
  | { kind: "search"; label: string; icon: LucideIcon }
  | { kind: "more"; label: string; icon: LucideIcon };

const TABS: TabItem[] = [
  { kind: "link", to: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { kind: "link", to: "/blocks", label: "Blocks", icon: Box, exact: false },
  {
    kind: "link",
    to: "/transactions",
    label: "Tx",
    icon: ArrowRightLeft,
    exact: false,
  },
  { kind: "search", label: "Search", icon: Search },
  { kind: "more", label: "More", icon: MoreHorizontal },
];

const MORE_ITEMS = [
  { to: "/masternodes", label: "Masternodes" },
  { to: "/dao", label: "DAO" },
] as const;

function isActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function MobileTabbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-screen-2xl grid-cols-5">
          {TABS.map((tab) => {
            if (tab.kind === "link") {
              const active = isActive(pathname, tab.to, tab.exact);
              return (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    activeOptions={{ exact: tab.exact }}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium no-underline transition-colors",
                      active
                        ? "text-accent"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-6 top-0 h-[2px] rounded-full bg-accent"
                      />
                    )}
                    <tab.icon className="size-5" />
                    <span>{tab.label}</span>
                  </Link>
                </li>
              );
            }
            if (tab.kind === "search") {
              return (
                <li key="search">
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="flex w-full flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <tab.icon className="size-5" />
                    <span>{tab.label}</span>
                  </button>
                </li>
              );
            }
            return (
              <li key="more">
                <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <tab.icon className="size-5" />
                      <span>{tab.label}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="rounded-t-2xl border-t bg-background p-0"
                  >
                    <SheetTitle className="sr-only">More</SheetTitle>
                    <div className="grid gap-1 p-4">
                      {MORE_ITEMS.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMoreOpen(false)}
                          className="rounded-md px-3 py-3 text-sm font-medium no-underline transition-colors hover:bg-secondary"
                          activeProps={{
                            className: "text-accent bg-accent/10",
                          }}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </li>
            );
          })}
        </ul>
      </nav>
      <div
        aria-hidden="true"
        className="h-14 md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      />

      {searchOpen && (
        <MobileSearchOverlay onClose={() => setSearchOpen(false)} />
      )}
    </>
  );
}

function MobileSearchOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-background/80 backdrop-blur"
        onClick={onClose}
      />
      <div className="absolute inset-x-4 top-6">
        <SpotlightSearch className="w-full" />
      </div>
    </div>
  );
}
