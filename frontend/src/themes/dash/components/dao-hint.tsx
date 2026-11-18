import { type ReactNode, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export function DaoHint({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
          className="inline-flex max-w-full items-center rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{description}</TooltipContent>
    </Tooltip>
  );
}
