import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function PendingColumnHeader({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <Popover>
      <span className="inline-flex items-center gap-1">
        <span>{label}</span>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Pending features: ${label}`}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-action-subtle hover:text-accent focus-visible:outline-2 focus-visible:outline-ring data-[state=open]:bg-action-subtle data-[state=open]:text-accent"
          >
            <ChevronDown className="size-3" aria-hidden="true" />
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent
        align="end"
        className="w-64 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl p-3"
      >
        <p className="text-xs font-medium text-accent">API pending</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </PopoverContent>
    </Popover>
  );
}
