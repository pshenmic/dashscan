import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import NetworkSelector from "./network-selector";
import SearchBar from "./search-bar";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/blocks", label: "Blocks" },
  { to: "/transactions", label: "Transactions" },
  { to: "/masternodes", label: "Masternodes" },
  { to: "/dao", label: "DAO" },
] as const;

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-[88px]">
      <nav className="mx-auto flex h-full max-w-[1440px] items-center justify-between rounded-b-3xl border-b border-border bg-background/80 backdrop-blur-xs px-6">
        {/* Desktop layout (>= md) */}
        <div className="hidden md:flex md:items-center md:gap-8">
          <Link to="/" className="shrink-0">
            <img src="/dashscan-logo.svg" alt="DScan" className="h-7" />
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative text-sm no-underline transition after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-accent after:transition-all after:duration-200 hover:after:w-full"
              activeProps={{
                className: "font-bold text-accent after:w-full",
              }}
              inactiveProps={{
                className:
                  "font-medium text-foreground/50 hover:text-foreground",
              }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex md:items-center md:gap-3">
          <NetworkSelector />
          <SearchBar />
        </div>

        {/* Mobile layout (< md) */}
        <Link to="/" className="shrink-0 md:hidden">
          <img src="/dashscan-logo.svg" alt="DScan" className="h-7" />
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <div className="flex flex-col gap-6 p-6">
              <SearchBar onNavigate={() => setOpen(false)} />

              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-md px-3 py-2 text-sm no-underline transition"
                    activeProps={{
                      className: "font-bold text-accent bg-accent/10",
                    }}
                    inactiveProps={{
                      className:
                        "font-medium text-foreground/50 hover:text-foreground hover:bg-muted",
                    }}
                    activeOptions={{ exact: item.to === "/" }}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <NetworkSelector />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
