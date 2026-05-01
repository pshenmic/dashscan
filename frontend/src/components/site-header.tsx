import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { SpotlightSearch } from "@/components/spotlight-search";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", exact: true },
  { to: "/blocks", label: "Blocks", exact: false },
  { to: "/transactions", label: "Transactions", exact: false },
  { to: "/masternodes", label: "Masternodes", exact: false },
  { to: "/dao", label: "DAO", exact: false },
] as const;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center no-underline">
          <img src="/dashscan-logo.svg" alt="DashScan" className="h-6" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
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
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <SpotlightSearch />
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
