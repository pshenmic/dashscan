import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeSwitcher } from "@/themes/ThemeSwitcher";
import { ColorModeToggle } from "./color-mode-toggle";
import { HeaderSearch } from "./header-search";
import NetworkSelector from "./network-selector";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/blocks", label: "Blocks" },
  { to: "/transactions", label: "Transactions" },
  { to: "/masternodes", label: "Masternodes" },
  { to: "/dao", label: "DAO" },
] as const;

function NavigationLinks({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return NAV_ITEMS.map((item) => (
    <Link
      key={item.to}
      to={item.to}
      className={
        mobile
          ? "rounded-xl px-4 py-3 text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
          : "rounded-sm text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      }
      activeProps={{
        className: "font-extrabold text-accent",
        "aria-current": "page",
      }}
      inactiveProps={{ className: "font-medium text-muted-foreground" }}
      activeOptions={{ exact: item.to === "/" || item.to === "/dashboard" }}
      onClick={onNavigate}
    >
      {item.label}
    </Link>
  ));
}

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 mx-auto flex h-[88px] w-full max-w-[1440px] items-center justify-between gap-4 rounded-b-3xl border-b border-border bg-card px-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-8 min-[1400px]:gap-[95px]">
        <Link
          to="/"
          aria-label="DashScan home"
          className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <img
            src="/images/home/logo-light.svg"
            alt="DashScan"
            width="154"
            height="24"
            className="h-6 w-[130px] sm:w-[154px] dark:hidden"
          />
          <img
            src="/images/home/logo-dark.svg"
            alt="DashScan"
            width="154"
            height="24"
            className="hidden h-6 w-[130px] sm:w-[154px] dark:block"
          />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-6 whitespace-nowrap xl:flex min-[1400px]:gap-16"
        >
          <NavigationLinks />
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ColorModeToggle />
        <div className="hidden items-center gap-2 xl:flex">
          <ThemeSwitcher />
          <NetworkSelector />
        </div>
        <HeaderSearch />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-10 rounded-xl border-input bg-transparent text-foreground shadow-none hover:bg-secondary hover:text-foreground xl:hidden dark:bg-transparent dark:hover:bg-secondary"
              aria-label="Open navigation menu"
            >
              <Menu aria-hidden="true" className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-80 max-w-[calc(100vw-1rem)] overflow-y-auto bg-card px-4 py-8"
          >
            <SheetTitle className="px-4">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Explore DashScan and choose your network or design.
            </SheetDescription>
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              <NavigationLinks mobile onNavigate={() => setOpen(false)} />
            </nav>
            <div className="flex flex-wrap gap-2 border-t border-border px-4 pt-6">
              <ThemeSwitcher />
              <NetworkSelector />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
