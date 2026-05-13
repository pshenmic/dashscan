import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowRightLeft,
  Box,
  Clock,
  CornerDownLeft,
  Loader2,
  Search,
  Server,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import { blocksQueryOptions } from "@/lib/api/blocks";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import { searchQueryOptions } from "@/lib/api/search";
import { appStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SpotlightSearchProps {
  className?: string;
}

type Category = "Block" | "Transaction" | "Masternode" | "Address" | "DAO";

const CATEGORY_STYLES: Record<
  Category,
  { dot: string; chip: string; icon: ComponentType<{ className?: string }> }
> = {
  Block: {
    dot: "bg-accent",
    chip: "bg-accent/12 text-accent",
    icon: Box,
  },
  Transaction: {
    dot: "bg-accent-lime",
    chip: "bg-accent-lime/15 text-foreground",
    icon: ArrowRightLeft,
  },
  Masternode: {
    dot: "bg-accent-teal",
    chip: "bg-accent-teal/15 text-accent-teal",
    icon: Server,
  },
  Address: {
    dot: "bg-accent-amber",
    chip: "bg-accent-amber/15 text-foreground",
    icon: Wallet,
  },
  DAO: {
    dot: "bg-accent-violet",
    chip: "bg-accent-violet/15 text-accent-violet",
    icon: Sparkles,
  },
};

const RECENT_KEY = "dashscan:recent-searches";
const RECENT_MAX = 5;

type RecentItem = {
  category: Category;
  label: string;
  sub?: string;
  to: string;
};

function loadRecents(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentItem[];
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecents(items: RecentItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / private mode failures
  }
}

function truncate(value: string, head = 10, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function SpotlightSearch({ className }: SpotlightSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recents, setRecents] = useState<RecentItem[]>([]);
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

  useEffect(() => {
    if (open) setRecents(loadRecents());
  }, [open]);

  const { data, isFetching } = useQuery({
    ...searchQueryOptions({ network, query: debouncedQuery }),
    enabled: debouncedQuery.length > 0,
  });

  const { data: latestBlocks } = useQuery({
    ...blocksQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
    enabled: open,
  });
  const { data: topMasternodes } = useQuery({
    ...masternodesQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
    enabled: open,
  });

  const suggestions = useMemo<RecentItem[]>(() => {
    const items: RecentItem[] = [];
    const latest = latestBlocks?.resultSet?.[0];
    if (latest) {
      items.push({
        category: "Block",
        label: `Latest block · #${latest.height}`,
        sub: latest.hash,
        to: `/blocks/${latest.hash}`,
      });
    }
    const masternode = topMasternodes?.resultSet?.[0];
    if (masternode) {
      items.push({
        category: "Masternode",
        label: "Top masternode",
        sub: masternode.proTxHash,
        to: `/masternodes/${masternode.proTxHash}`,
      });
    }
    items.push({
      category: "DAO",
      label: "DAO budget & proposals",
      to: "/dao",
    });
    return items;
  }, [latestBlocks, topMasternodes]);

  const results = useMemo<RecentItem[]>(() => {
    if (!data) return [];
    const items: RecentItem[] = [];
    if (data.block) {
      items.push({
        category: "Block",
        label: `Block #${data.block.height}`,
        sub: data.block.hash,
        to: `/blocks/${data.block.hash}`,
      });
    }
    if (data.transaction) {
      items.push({
        category: "Transaction",
        label: data.transaction.hash,
        to: `/transactions/${data.transaction.hash}`,
      });
    }
    if (data.masternode) {
      items.push({
        category: "Masternode",
        label: data.masternode.proTxHash,
        to: `/masternodes/${data.masternode.proTxHash}`,
      });
    }
    if (data.address) {
      items.push({
        category: "Address",
        label: data.address.address,
        to: `/address/${data.address.address}`,
      });
    }
    return items;
  }, [data]);

  const pushRecent = useCallback((item: RecentItem) => {
    setRecents((prev) => {
      const next = [item, ...prev.filter((r) => r.to !== item.to)].slice(
        0,
        RECENT_MAX,
      );
      saveRecents(next);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (item: RecentItem) => {
      pushRecent(item);
      // biome-ignore lint/suspicious/noExplicitAny: dynamic route
      navigate({ to: item.to as any });
      setQuery("");
      setDebouncedQuery("");
      setOpen(false);
    },
    [navigate, pushRecent],
  );

  const showEmptyState = !debouncedQuery;

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
              {showEmptyState && (
                <>
                  {recents.length > 0 && (
                    <CommandGroup heading="Recent searches">
                      {recents.map((item) => (
                        <SpotlightItem
                          key={`recent-${item.to}`}
                          item={item}
                          icon={
                            <Clock className="size-4 text-muted-foreground" />
                          }
                          onSelect={() => handleSelect(item)}
                        />
                      ))}
                    </CommandGroup>
                  )}
                  <CommandGroup heading="Suggestions">
                    {suggestions.map((item) => (
                      <SpotlightItem
                        key={`sugg-${item.to}`}
                        item={item}
                        onSelect={() => handleSelect(item)}
                      />
                    ))}
                  </CommandGroup>
                </>
              )}
              {debouncedQuery && isFetching && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Searching…
                </div>
              )}
              {debouncedQuery && !isFetching && results.length === 0 && (
                <CommandEmpty>No results for "{debouncedQuery}".</CommandEmpty>
              )}
              {!showEmptyState &&
                results.map((item) => (
                  <CommandGroup key={item.category} heading={item.category}>
                    <SpotlightItem
                      item={item}
                      onSelect={() => handleSelect(item)}
                    />
                  </CommandGroup>
                ))}
            </CommandList>
            <SpotlightFooter />
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SpotlightItem({
  item,
  icon,
  onSelect,
}: {
  item: RecentItem;
  icon?: React.ReactNode;
  onSelect: () => void;
}) {
  const style = CATEGORY_STYLES[item.category];
  const Icon = style.icon;
  return (
    <CommandItem
      value={`${item.category}-${item.to}`}
      onSelect={onSelect}
      className="flex items-start gap-3"
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md",
          style.chip,
        )}
      >
        {icon ?? <Icon className="size-3.5" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-mono text-xs">
          {item.label.startsWith("0") || item.label.length > 24
            ? truncate(item.label)
            : item.label}
        </span>
        {item.sub && (
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {truncate(item.sub, 12, 8)}
          </span>
        )}
      </div>
      <span
        className={cn(
          "ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
          style.chip,
        )}
      >
        <span
          className={cn(
            "mr-1.5 inline-block size-1.5 rounded-full align-middle",
            style.dot,
          )}
        />
        {item.category}
      </span>
    </CommandItem>
  );
}

function SpotlightFooter() {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <FooterKey>
            <CornerDownLeft className="size-2.5" />
          </FooterKey>
          open
        </span>
        <span className="flex items-center gap-1">
          <FooterKey>↑</FooterKey>
          <FooterKey>↓</FooterKey>
          navigate
        </span>
        <span className="flex items-center gap-1">
          <FooterKey>esc</FooterKey>
          close
        </span>
      </span>
      <span className="flex items-center gap-1">
        <FooterKey>?</FooterKey>
        shortcuts
      </span>
    </div>
  );
}

function FooterKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] font-medium text-foreground">
      {children}
    </kbd>
  );
}
