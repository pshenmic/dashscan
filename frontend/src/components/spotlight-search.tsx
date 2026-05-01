import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowRightLeft,
  Box,
  Loader2,
  Search,
  Server,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchQueryOptions } from "@/lib/api/search";
import { appStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SpotlightSearchProps {
  className?: string;
}

export function SpotlightSearch({ className }: SpotlightSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const network = useStore(appStore, (s) => s.network);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data, isFetching } = useQuery({
    ...searchQueryOptions({ network, query: debouncedQuery }),
    enabled: debouncedQuery.length > 0,
  });

  const results = useMemo(() => {
    if (!data) return [];
    const items: {
      category: string;
      label: string;
      sub?: string;
      icon: typeof Box;
      to: string;
    }[] = [];
    if (data.block) {
      items.push({
        category: "Block",
        label: `Block #${data.block.height}`,
        sub: data.block.hash,
        icon: Box,
        to: `/blocks/${data.block.hash}`,
      });
    }
    if (data.transaction) {
      items.push({
        category: "Transaction",
        label: data.transaction.hash,
        icon: ArrowRightLeft,
        to: `/transactions/${data.transaction.hash}`,
      });
    }
    if (data.masternode) {
      items.push({
        category: "Masternode",
        label: data.masternode.proTxHash,
        icon: Server,
        to: `/masternodes/${data.masternode.proTxHash}`,
      });
    }
    if (data.address) {
      items.push({
        category: "Address",
        label: data.address.address,
        icon: Wallet,
        to: `/address/${data.address.address}`,
      });
    }
    return items;
  }, [data]);

  const handleSelect = useCallback(
    (to: string) => {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic route
      navigate({ to: to as any });
      setQuery("");
      setDebouncedQuery("");
      setOpen(false);
    },
    [navigate],
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "h-9 w-full justify-start gap-2 px-3 font-normal text-muted-foreground hover:text-foreground sm:w-[280px]",
          className,
        )}
        aria-label="Open search"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search…</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 shrink-0 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="overflow-hidden p-0 sm:max-w-[640px]"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <Command
            shouldFilter={false}
            className="[&_[cmdk-input-wrapper]]:border-b"
          >
            <CommandInput
              placeholder="Block height, tx hash, address, masternode…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[420px]">
              {!debouncedQuery && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Start typing to search the chain.
                </div>
              )}
              {debouncedQuery && isFetching && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Searching…
                </div>
              )}
              {debouncedQuery && !isFetching && results.length === 0 && (
                <CommandEmpty>No results for “{debouncedQuery}”.</CommandEmpty>
              )}
              {results.map((item) => (
                <CommandGroup key={item.category} heading={item.category}>
                  <CommandItem
                    value={item.to}
                    onSelect={() => handleSelect(item.to)}
                    className="flex items-start gap-3"
                  >
                    <item.icon className="mt-0.5 size-4 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-xs">
                        {item.label}
                      </span>
                      {item.sub && (
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          {item.sub}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
