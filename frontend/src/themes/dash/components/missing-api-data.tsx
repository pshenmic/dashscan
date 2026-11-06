import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function MissingApiData({
  description,
  className,
  compact = false,
  inline = false,
}: {
  description: string;
  className?: string;
  compact?: boolean;
  inline?: boolean;
}) {
  const indicator = (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "dash-label-small inline-flex min-h-6 w-fit shrink-0 items-center rounded-lg border border-dashed border-accent/30 bg-accent/5 px-2 py-1 font-extrabold text-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            inline && className,
          )}
        >
          API pending
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="max-w-[calc(100vw-2rem)] rounded-xl text-sm"
        sideOffset={8}
      >
        {description}
      </PopoverContent>
    </Popover>
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
