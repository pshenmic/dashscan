import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowRightLeft,
  Box,
  History,
  Loader2,
  Server,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { searchQueryOptions } from "@/lib/api/search";
import { formatNumber } from "@/lib/format";
import { appStore } from "@/lib/store";
import {
  type SearchEntry,
  searchHint,
  searchPath,
  useSearchHistory,
} from "@/themes/dash/lib/search-history";
import { HomeIcon } from "./home-icon";

interface SearchBarProps {
  onNavigate?: () => void;
  descriptionId?: string;
}

const resultIcons = {
  block: Box,
  transaction: ArrowRightLeft,
  masternode: Server,
  address: Wallet,
};

export default function SearchBar({
  onNavigate,
  descriptionId,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const instructionsId = useId();
  const network = useStore(appStore, (state) => state.network);
  const previousNetwork = useRef(network);
  const navigate = useNavigate();
  const history = useSearchHistory(network);
  const trimmedQuery = query.trim();
  const hint = searchHint(trimmedQuery, network);
  const showingHistory = trimmedQuery.length === 0;

  useEffect(() => {
    if (previousNetwork.current !== network) {
      previousNetwork.current = network;
      setActiveIndex(-1);
    }
  }, [network]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching, isError, refetch } = useQuery({
    ...searchQueryOptions({ network, query: debouncedQuery }),
    enabled: !hint && trimmedQuery === debouncedQuery,
  });
  const pending = !hint && (trimmedQuery !== debouncedQuery || isFetching);
  const current = !hint && !pending && !isError ? data : undefined;
  const results: SearchEntry[] = [
    ...(current?.block
      ? [
          {
            label: `Block #${formatNumber(current.block.height)}`,
            kind: "block" as const,
            id: current.block.hash,
            network,
          },
        ]
      : []),
    ...(current?.transaction
      ? [
          {
            label: `Transaction ${current.transaction.hash}`,
            kind: "transaction" as const,
            id: current.transaction.hash,
            network,
          },
        ]
      : []),
    ...(current?.masternode
      ? [
          {
            label: `Masternode ${current.masternode.proTxHash}`,
            kind: "masternode" as const,
            id: current.masternode.proTxHash,
            network,
          },
        ]
      : []),
    ...(current?.address
      ? [
          {
            label: `Address ${current.address.address}`,
            kind: "address" as const,
            id: current.address.address,
            network,
          },
        ]
      : []),
  ];
  const options = showingHistory ? history.entries : results;

  function selectResult(index: number) {
    const result = options[index];
    if (!result) return;
    if (history.enabled) history.remember(result);
    void navigate({ to: searchPath(result) });
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
    setActiveIndex(-1);
    onNavigate?.();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <search aria-label="Network search">
        <PopoverAnchor asChild>
          <form
            className="flex w-full min-w-0 items-center gap-2 rounded-3xl border border-input bg-background p-1.5 pl-6 transition-shadow duration-150 focus-within:ring-2 focus-within:ring-ring"
            onSubmit={(event) => {
              event.preventDefault();
              setOpen(true);
              setDebouncedQuery(query.trim());
              if (!pending && (!showingHistory || activeIndex >= 0))
                selectResult(Math.max(activeIndex, 0));
              inputRef.current?.focus();
            }}
          >
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label="Search blocks, transactions, addresses and masternodes"
              aria-autocomplete="list"
              aria-busy={pending}
              aria-expanded={open}
              aria-describedby={
                descriptionId
                  ? `${descriptionId} ${instructionsId}`
                  : instructionsId
              }
              aria-controls={open ? listId : undefined}
              aria-activedescendant={
                open && !pending && options[activeIndex]
                  ? `${listId}-${activeIndex}`
                  : undefined
              }
              autoComplete="off"
              spellCheck={false}
              placeholder="Search…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={() => {
                history.reload();
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                  return;
                }
                if (
                  (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                  options.length
                ) {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((index) =>
                    event.key === "ArrowDown"
                      ? (index + 1) % options.length
                      : index <= 0
                        ? options.length - 1
                        : index - 1,
                  );
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
            <span id={instructionsId} className="sr-only">
              Enter an address, transaction or block hash, block height, or
              masternode ProTxHash. Use arrow keys to choose a result, Enter to
              open it, and Escape to close suggestions.
            </span>
            <button
              type="submit"
              aria-label="Search"
              className="dash-home-action flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-foreground/8 text-foreground hover:bg-foreground/12 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <HomeIcon name="search" />
              )}
            </button>
          </form>
        </PopoverAnchor>
      </search>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] rounded-2xl p-2"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (
            event.target instanceof Node &&
            inputRef.current?.form?.contains(event.target)
          )
            event.preventDefault();
        }}
      >
        <div aria-live="polite" className="text-sm text-muted-foreground">
          {showingHistory ? (
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">Recent searches</p>
                {history.available && (
                  <div className="flex shrink-0 items-center gap-1">
                    {history.enabled && options.length > 0 && (
                      <button
                        type="button"
                        aria-label="Clear history"
                        title="Clear history"
                        className="flex size-8 items-center justify-center rounded-lg hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                        onClick={() => {
                          history.clear();
                          setActiveIndex(-1);
                        }}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Save recent searches"
                      aria-pressed={history.enabled}
                      title={
                        history.enabled
                          ? "Turn off and clear history"
                          : "Turn on history"
                      }
                      className="flex size-8 items-center justify-center rounded-lg hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:text-accent"
                      onClick={() => {
                        history.toggle();
                        setActiveIndex(-1);
                      }}
                    >
                      <History aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                )}
              </div>
              {!history.available ? (
                <p>Local history is unavailable in this browser.</p>
              ) : !history.enabled ? (
                <p>Search history is off.</p>
              ) : !options.length ? (
                <p>No recent searches.</p>
              ) : null}
            </div>
          ) : hint ? (
            <p className="p-3">{hint}</p>
          ) : pending ? (
            <p className="p-3">Searching…</p>
          ) : isError ? (
            <div className="p-3">
              Search is unavailable.{" "}
              <button
                type="button"
                className="text-accent underline"
                onClick={() => void refetch()}
              >
                Try again
              </button>
            </div>
          ) : !results.length ? (
            <p className="p-3">
              No results found on{" "}
              {network === "mainnet" ? "Mainnet" : "Testnet"}. Check the
              identifier and selected network.
            </p>
          ) : (
            <p className="sr-only">{results.length} results available.</p>
          )}
        </div>
        <div className="flex">
          <div
            id={listId}
            role="listbox"
            aria-label={showingHistory ? "Recent searches" : "Search results"}
            className="min-w-0 flex-1"
          >
            {!pending &&
              options.map((result, index) => {
                const Icon = resultIcons[result.kind];
                return (
                  <button
                    key={searchPath(result)}
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={activeIndex === index}
                    className="flex h-12 w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring aria-selected:bg-secondary"
                    title={result.label}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectResult(index)}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-accent"
                    />
                    <span className="truncate">{result.label}</span>
                  </button>
                );
              })}
          </div>
          {showingHistory && options.length > 0 && (
            <div className="shrink-0">
              {options.map((entry) => (
                <button
                  key={searchPath(entry)}
                  type="button"
                  aria-label={`Remove ${entry.label} from recent searches`}
                  className="flex size-12 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => {
                    history.remove(entry);
                    setActiveIndex(-1);
                  }}
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
