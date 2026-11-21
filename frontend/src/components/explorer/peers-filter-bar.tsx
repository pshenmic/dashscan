import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/explorer/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PeerStatusFilter = "all" | "available" | "unavailable";

export type PeerFilters = {
  status: PeerStatusFilter;
  country: string | null;
  userAgent: string | null;
};

export const EMPTY_PEER_FILTERS: PeerFilters = {
  status: "all",
  country: null,
  userAgent: null,
};

export function PeerColumnPicker({
  label,
  plural,
  className,
  value,
  options,
  onChange,
}: {
  value: string | null;
  label: string;
  plural: string;
  className: string;
  options: { value: string; label: string; count: number }[];
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={className}
          data-active={!!value}
          aria-label={`Filter: ${label}`}
        >
          {label}
          <ChevronDown className="size-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] rounded-xl p-0"
      >
        <Command>
          <CommandInput placeholder={`Search ${plural}…`} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading={label}>
              <CommandItem
                value={`all-${plural}`}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn(value !== null && "opacity-0")} />
                <span className="flex-1">All {plural}</span>
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(value !== option.value && "opacity-0")}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {option.label}
                  </span>
                  <Badge variant="soft" className="font-mono tabular-nums">
                    {formatNumber(option.count)}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
