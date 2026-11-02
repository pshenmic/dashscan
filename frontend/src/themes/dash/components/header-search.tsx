import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HomeIcon } from "./home-icon";
import SearchBar from "./search-bar";

export function HeaderSearch() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return pathname === "/" ? null : <HeaderSearchContent key={pathname} />;
}

function HeaderSearchContent() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <>
      <div className="hidden w-[280px] xl:block min-[1400px]:w-[300px]">
        <SearchBar compact value={query} onValueChange={setQuery} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-xl border-input bg-transparent text-foreground shadow-none hover:bg-secondary hover:text-foreground xl:hidden dark:bg-transparent dark:hover:bg-secondary"
            aria-label="Open search"
          >
            <HomeIcon name="search" />
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-3xl bg-card pt-10 sm:max-w-xl">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Find an address, transaction, block or masternode.
          </DialogDescription>
          <SearchBar
            value={query}
            onValueChange={setQuery}
            onNavigate={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
