import { Check, Copy, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CopyButton({ value }: { value: string }) {
  return <CopyControl key={value} value={value} />;
}

function CopyControl({ value }: { value: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "copied" | "error">(
    "idle",
  );
  const [open, setOpen] = useState(false);
  const request = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    return () => {
      request.current += 1;
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  async function handleClick(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    const currentRequest = ++request.current;
    if (timeout.current) clearTimeout(timeout.current);
    setStatus("pending");
    setOpen(true);
    try {
      await navigator.clipboard.writeText(value);
      if (request.current !== currentRequest) return;
      setStatus("copied");
    } catch {
      if (request.current !== currentRequest) return;
      setStatus("error");
    }
    busy.current = false;
    timeout.current = setTimeout(() => {
      setOpen(false);
      setStatus("idle");
    }, 2000);
  }

  const message =
    status === "copied"
      ? "Copied!"
      : status === "error"
        ? "Could not copy. Try again."
        : status === "pending"
          ? "Copying…"
          : "Copy";
  const Icon =
    status === "copied"
      ? Check
      : status === "error"
        ? X
        : status === "pending"
          ? Loader2
          : Copy;
  return (
    <span className="relative inline-flex shrink-0">
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Copy to clipboard"
            aria-disabled={status === "pending"}
            aria-busy={status === "pending"}
            onClick={handleClick}
            className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-150 hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${status === "copied" ? "text-success" : status === "error" ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon
              aria-hidden="true"
              className={`size-3.5 ${status === "pending" ? "motion-safe:animate-spin" : ""}`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>{message}</TooltipContent>
      </Tooltip>
      <output className="sr-only">
        {status === "copied" || status === "error" ? message : ""}
      </output>
    </span>
  );
}
