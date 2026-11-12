import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
  paginationSearchSchema,
} from "@/lib/pagination";

interface PageSizeSelectProps {
  value: number;
  onChange: (size: PageSize) => void;
}

export function PageSizeSelect({ value, onChange }: PageSizeSelectProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Show</span>
      <Select
        value={String(value)}
        onValueChange={(value) =>
          onChange(paginationSearchSchema.parse({ limit: Number(value) }).limit)
        }
      >
        <SelectTrigger
          size="sm"
          aria-label="Records per page"
          className="w-18 text-xs tabular-nums"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="top"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="min-w-[var(--radix-select-trigger-width)] rounded-lg data-[side=top]:translate-y-0 data-[side=bottom]:translate-y-0"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <SelectItem
              key={opt}
              value={String(opt)}
              className="text-xs tabular-nums focus:bg-action-subtle focus:text-accent"
            >
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>records</span>
    </div>
  );
}
