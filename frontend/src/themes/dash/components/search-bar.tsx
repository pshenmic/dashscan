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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchQueryOptions } from "@/lib/api/search";
import { appStore } from "@/lib/store";

interface SearchBarProps {
  onNavigate?: () => void;
}

export default function SearchBar({ onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const network = useStore(appStore, (s) => s.network);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOpen(debouncedQuery.length > 0);
  }, [debouncedQuery]);

  const { data, isFetching } = useQuery(
    searchQueryOptions({ network, query: debouncedQuery }),
  );

  const results = useMemo(() => {
    if (!data) return [];
    const items: {
      category: string;
      label: string;
      icon: typeof Box;
      to: string;
    }[] = [];

    if (data.block) {
      items.push({
        category: "Block",
        label: `Block #${data.block.height}`,
        icon: Box,
        to: `/blocks/${data.block.hash}`,
      });
    }
    if (data.transaction) {
      items.push({
        category: "Transaction",
        label: `${data.transaction.hash.slice(0, 12)}...`,
        icon: ArrowRightLeft,
        to: `/transactions/${data.transaction.hash}`,
      });
    }
    if (data.masternode) {
      items.push({
        category: "Masternode",
        label: `${data.masternode.proTxHash.slice(0, 12)}...`,
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
      navigate({ to });
      setQuery("");
      setDebouncedQuery("");
      setOpen(false);
      onNavigate?.();
    },
    [navigate, onNavigate],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex w-full items-center rounded-xl border border-border bg-transparent transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_3px_oklch(from_var(--accent)_l_c_h/0.12)] md:w-auto">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-w-0 bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none md:w-48"
          />
          <button
            type="button"
            className="mr-1.5 flex items-center justify-center rounded-md bg-muted p-1.5 transition hover:opacity-80"
            aria-label="Search"
          >
            {isFetching ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="size-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {results.map((item) => (
              <CommandGroup key={item.category} heading={item.category}>
                <CommandItem onSelect={() => handleSelect(item.to)}>
                  <item.icon />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
