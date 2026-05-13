import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SpotlightSearch } from "@/themes/neo/components/spotlight-search";
import { ThemeSwitcher } from "@/themes/ThemeSwitcher";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", exact: true },
  { to: "/blocks", label: "Blocks", exact: false },
  { to: "/transactions", label: "Transactions", exact: false },
  { to: "/masternodes", label: "Masternodes", exact: false },
  { to: "/dao", label: "DAO", exact: false },
] as const;

function isActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeIndex = NAV_ITEMS.findIndex((item) =>
    isActive(pathname, item.to, item.exact),
  );

  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when active changes
  useLayoutEffect(() => {
    const node = activeRef.current;
    if (!node) {
      setBox(null);
      return;
    }
    const parent = node.parentElement;
    if (!parent) return;
    const measure = () => {
      const parentRect = parent.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      setBox({ left: rect.left - parentRect.left, width: rect.width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeIndex, pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center no-underline">
          <img src="/dashscan-logo.svg" alt="DashScan" className="h-6" />
        </Link>

        <nav className="relative hidden h-full items-center gap-1 md:flex">
          {box && activeIndex >= 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute bottom-[-1px] z-10 h-[2px] rounded-full bg-accent",
                hasMounted
                  ? "transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  : "",
              )}
              style={{
                left: `${box.left}px`,
                width: `${box.width}px`,
                boxShadow:
                  "0 0 12px 0 color-mix(in oklab, var(--accent) 50%, transparent)",
              }}
            />
          )}
          {NAV_ITEMS.map((item, index) => {
            const active = index === activeIndex;
            return (
              <Link
                key={item.to}
                ref={active ? activeRef : undefined}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors",
                )}
                activeProps={{
                  className: "text-accent",
                }}
                inactiveProps={{
                  className: "text-muted-foreground hover:text-foreground",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <SpotlightSearch />
          <ThemeSwitcher />
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-80 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex flex-col gap-6 p-6">
              <SpotlightSearch />

              <nav className="flex flex-col">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.exact }}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors"
                    activeProps={{
                      className: "text-accent bg-accent/10",
                    }}
                    inactiveProps={{
                      className:
                        "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
