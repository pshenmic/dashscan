import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu } from "lucide-react";
import { NavigationMenu } from "radix-ui";
import { useEffect, useRef, useState } from "react";
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
  {
    label: "Blockchain",
    items: [
      { to: "/blocks", label: "Blocks" },
      { to: "/transactions", label: "Transactions" },
      { to: "/addresses", label: "Addresses" },
    ],
  },
  {
    label: "Network",
    items: [
      { to: "/masternodes", label: "Masternodes" },
      { to: "/peers", label: "Peers" },
    ],
  },
  { to: "/dao", label: "DAO" },
] as const;

function isActiveRoute(pathname: string, destination: string) {
  return (
    pathname === destination ||
    (destination !== "/" && pathname.startsWith(`${destination}/`)) ||
    (destination === "/addresses" && pathname.startsWith("/address/"))
  );
}

function NavigationLinks({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [menu, setMenu] = useState("");
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setMenu("");
    }
  }, [pathname]);

  const linkClassName = (active: boolean, nested = false) =>
    `flex min-h-10 items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
      mobile || nested
        ? "px-4 py-3 hover:bg-secondary"
        : "py-2 hover:text-foreground"
    } ${active ? "text-accent underline decoration-2 underline-offset-8" : "text-muted-foreground"}`;

  const items = NAV_ITEMS.map((item) => {
    if (!("items" in item)) {
      const active = isActiveRoute(pathname, item.to);
      const link = (
        <Link
          key={item.to}
          to={item.to}
          activeProps={{}}
          aria-current={
            active ? (pathname === item.to ? "page" : "location") : undefined
          }
          className={linkClassName(active)}
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      );
      return mobile ? (
        link
      ) : (
        <NavigationMenu.Item key={item.to}>
          <NavigationMenu.Link asChild>{link}</NavigationMenu.Link>
        </NavigationMenu.Item>
      );
    }

    const links = item.items.map((child) => {
      const active = isActiveRoute(pathname, child.to);
      const link = (
        <Link
          key={child.to}
          to={child.to}
          activeProps={{}}
          aria-current={
            active ? (pathname === child.to ? "page" : "location") : undefined
          }
          className={linkClassName(active, true)}
          onClick={onNavigate}
        >
          {child.label}
        </Link>
      );
      return mobile ? (
        link
      ) : (
        <NavigationMenu.Link key={child.to} asChild>
          {link}
        </NavigationMenu.Link>
      );
    });

    if (mobile) {
      return (
        <section
          key={item.label}
          aria-label={item.label}
          className="border-t border-border pt-3"
        >
          <p className="px-4 pb-1 text-xs font-medium text-muted-foreground">
            {item.label}
          </p>
          {links}
        </section>
      );
    }

    const active = item.items.some((child) =>
      isActiveRoute(pathname, child.to),
    );
    return (
      <NavigationMenu.Item
        key={item.label}
        value={item.label}
        className="relative"
      >
        <NavigationMenu.Trigger asChild>
          <button
            type="button"
            className={`${linkClassName(active)} group gap-1.5`}
          >
            {item.label}
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          </button>
        </NavigationMenu.Trigger>
        <NavigationMenu.Content className="absolute left-0 top-full z-50 min-w-48 pt-2">
          <div className="rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md">
            {links}
          </div>
        </NavigationMenu.Content>
      </NavigationMenu.Item>
    );
  });

  return mobile ? (
    items
  ) : (
    <NavigationMenu.Root
      value={menu}
      onValueChange={setMenu}
      aria-label="Main navigation"
      delayDuration={150}
      skipDelayDuration={300}
      className="relative hidden xl:block"
    >
      <NavigationMenu.List className="flex list-none items-center gap-6 whitespace-nowrap min-[1400px]:gap-10">
        {items}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
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
        <NavigationLinks />
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
