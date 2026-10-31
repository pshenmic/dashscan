import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ArrowRightLeft, Box, Loader2, Server, Wallet } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { searchQueryOptions } from "@/lib/api/search";
import { formatNumber } from "@/lib/format";
import { appStore } from "@/lib/store";
import { HomeIcon } from "./home-icon";

interface SearchBarProps {
  onNavigate?: () => void;
}

export default function SearchBar({ onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const network = useStore(appStore, (state) => state.network);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching, isError, refetch } = useQuery(
    searchQueryOptions({ network, query: debouncedQuery }),
  );
  const pending = query.trim() !== debouncedQuery || isFetching;
  const current = query.trim() === debouncedQuery ? data : undefined;
  const results = [
    ...(current?.block
      ? [
          {
            label: `Block #${formatNumber(current.block.height)}`,
            icon: Box,
            to: `/blocks/${current.block.hash}`,
          },
        ]
      : []),
    ...(current?.transaction
      ? [
          {
            label: `Transaction ${current.transaction.hash}`,
            icon: ArrowRightLeft,
            to: `/transactions/${current.transaction.hash}`,
          },
        ]
      : []),
    ...(current?.masternode
      ? [
          {
            label: `Masternode ${current.masternode.proTxHash}`,
            icon: Server,
            to: `/masternodes/${current.masternode.proTxHash}`,
          },
        ]
      : []),
    ...(current?.address
      ? [
          {
            label: `Address ${current.address.address}`,
            icon: Wallet,
            to: `/address/${current.address.address}`,
          },
        ]
      : []),
  ];

  function selectResult(index: number) {
    const result = results[index];
    if (!result) return;
    void navigate({ to: result.to });
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
    setActiveIndex(-1);
    onNavigate?.();
  }

  return (
    <Popover open={open && query.trim().length > 0} onOpenChange={setOpen}>
      <search aria-label="Network search">
        <PopoverAnchor asChild>
          <form
            className="flex w-full min-w-0 items-center gap-2 rounded-3xl border border-input bg-transparent p-1.5 pl-6 transition-shadow duration-150 focus-within:ring-2 focus-within:ring-ring"
            onSubmit={(event) => {
              event.preventDefault();
              setOpen(true);
              setDebouncedQuery(query.trim());
              if (!pending) selectResult(Math.max(activeIndex, 0));
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
              aria-expanded={open && query.trim().length > 0}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={
                open && !pending && results[activeIndex]
                  ? `${listId}-${activeIndex}`
                  : undefined
              }
              autoComplete="off"
              spellCheck={false}
              placeholder="Search..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={() => {
                if (query.trim()) setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  return;
                }
                if (
                  (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                  results.length
                ) {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((index) =>
                    event.key === "ArrowDown"
                      ? (index + 1) % results.length
                      : index <= 0
                        ? results.length - 1
                        : index - 1,
                  );
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
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
          {pending ? (
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
            <p className="p-3">No results found.</p>
          ) : null}
        </div>
        <div id={listId} role="listbox" aria-label="Search results">
          {!pending &&
            results.map((result, index) => (
              <button
                key={result.to}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className="flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring aria-selected:bg-secondary"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectResult(index)}
              >
                <result.icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-accent"
                />
                <span className="truncate">{result.label}</span>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
