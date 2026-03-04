import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setOpen(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 1500);
  }

  return (
    <Tooltip
      open={open}
      onOpenChange={(v) => {
        if (copied && !v) return;
        if (v) setCopied(false);
        setOpen(v);
      }}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className="relative cursor-pointer"
        >
          <Copy
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-all duration-200 hover:text-foreground",
              copied && "scale-0 opacity-0",
            )}
          />
          <Check
            className={cn(
              "absolute inset-0 size-3.5 shrink-0 text-green-500 transition-all duration-200",
              copied ? "scale-100 opacity-100" : "scale-0 opacity-0",
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}
