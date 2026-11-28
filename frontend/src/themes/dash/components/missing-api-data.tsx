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
import { cn } from "@/lib/utils";

export function MissingApiData({
  description,
  className,
  compact = false,
  inline = false,
  label = "API",
}: {
  description: string;
  className?: string;
  compact?: boolean;
  inline?: boolean;
  label?: string;
}) {
  const indicator = (
    <Tooltip>
      <Popover>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Data unavailable: ${description}`}
              className={cn(
                "inline-flex min-h-6 w-fit shrink-0 items-center rounded-lg border border-dashed border-accent/30 bg-accent/5 px-1.5 py-0.5 text-[10px] leading-4 font-extrabold text-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                inline && className,
              )}
            >
              {label}
            </button>
          </TooltipTrigger>
        </PopoverTrigger>
        <PopoverContent
          className="max-w-[calc(100vw-2rem)] rounded-xl text-sm"
          sideOffset={8}
        >
          {description}
        </PopoverContent>
      </Popover>
      <TooltipContent className="max-w-64 bg-popover text-popover-foreground border border-border">
        {description}
      </TooltipContent>
    </Tooltip>
  );
  return inline ? (
    indicator
  ) : (
    <div
      className={cn(
        compact ? "flex items-center" : "flex items-center justify-center",
        className,
      )}
    >
      {indicator}
    </div>
  );
}
