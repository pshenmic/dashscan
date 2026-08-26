import { Search } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LazySpotlightSearchDialog = lazy(() =>
  import("@/themes/neo/components/spotlight-search").then((module) => ({
    default: module.SpotlightSearchDialog,
  })),
);

interface SpotlightSearchProps {
  className?: string;
  defaultOpen?: boolean;
  enableShortcut?: boolean;
  hideTrigger?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SpotlightSearch({
  className,
  defaultOpen = false,
  enableShortcut = false,
  hideTrigger = false,
  onOpenChange,
}: SpotlightSearchProps) {
  const [open, setOpen] = useState(defaultOpen);
  const dialogId = useId();
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (!enableShortcut) return;

    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (!open && document.querySelector('[aria-modal="true"]')) return;
        event.preventDefault();
        handleOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enableShortcut, handleOpenChange, open]);

  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleOpenChange, open]);

  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOpenChange(true)}
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 font-normal text-muted-foreground hover:text-foreground sm:w-[280px]",
            className,
          )}
          aria-label="Open search"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">Search…</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 shrink-0 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      )}

      {open && (
        <Suspense fallback={<SearchLoadingStatus />}>
          <LazySpotlightSearchDialog
            id={dialogId}
            open={open}
            onOpenChange={handleOpenChange}
          />
        </Suspense>
      )}
    </>
  );
}

function SearchLoadingStatus() {
  return (
    <div
      role="dialog"
      aria-label="Search"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-4 pt-[10vh] backdrop-blur-sm"
    >
      <output
        aria-live="polite"
        className="w-full max-w-[640px] rounded-lg border bg-popover px-6 py-8 text-center text-sm text-muted-foreground shadow-lg"
      >
        Loading search…
      </output>
    </div>
  );
}
