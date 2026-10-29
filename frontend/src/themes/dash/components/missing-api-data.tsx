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
  if (inline) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "dash-label-small shrink-0 rounded-lg border border-dashed border-accent/40 bg-accent/5 px-2 py-1 font-extrabold text-accent focus-visible:outline-2 focus-visible:outline-ring",
              className,
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
  }
  if (compact) {
    return (
      <details
        className={cn(
          "rounded-xl border border-dashed border-accent/40 bg-accent/5 p-2",
          className,
        )}
      >
        <summary className="dash-label-small cursor-pointer rounded-md font-extrabold text-accent focus-visible:outline-2 focus-visible:outline-ring">
          API pending
        </summary>
        <p className="dash-label-small mt-2 text-muted-foreground">
          {description}
        </p>
      </details>
    );
  }
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-accent/40 bg-accent/5 p-3",
        className,
      )}
    >
      <span className="dash-label-small inline-flex rounded-md bg-accent/12 px-2 py-1 font-extrabold text-accent">
        API pending
      </span>
      <p className="dash-label-small mt-2 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
