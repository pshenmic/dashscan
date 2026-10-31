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
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-10 rounded-xl border-input bg-transparent text-foreground shadow-none hover:bg-secondary hover:text-foreground dark:bg-transparent dark:hover:bg-secondary"
          aria-label="Open search"
        >
          <HomeIcon name="search" />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl bg-card pt-10 sm:max-w-xl">
        <DialogTitle>Search Through Network</DialogTitle>
        <DialogDescription>
          Find an address, transaction, block or masternode.
        </DialogDescription>
        <SearchBar onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
