import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoPopover({
  label,
  children,
  trigger,
}: {
  label: string;
  children: ReactNode;
  trigger: ReactNode;
}) {
  return (
    <Tooltip>
      <Popover>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className="cursor-help rounded text-left [font:inherit] hover:underline hover:decoration-dotted hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {trigger}
            </button>
          </TooltipTrigger>
        </PopoverTrigger>
        <PopoverContent className="max-w-[calc(100vw-2rem)] text-sm">
          {children}
        </PopoverContent>
      </Popover>
      <TooltipContent className="max-w-72 rounded-xl border border-border bg-popover text-popover-foreground text-sm">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
