import {
  Calendar,
  ChevronDown,
  CircleCheck,
  Filter,
  Globe2,
  ServerCrash,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { MnStatusBucket, MnTypeBucket } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  countryFlagEmoji,
  countryName,
} from "@/themes/neo/components/masternode-map/iso-codes";
import { Badge } from "@/themes/neo/components/ui/badge";

export type StatusBucket = MnStatusBucket;
export type TypeBucket = MnTypeBucket;
export type LastPaidWindow = "any" | "24h" | "7d" | "30d" | "90d" | "never";
export type PoseFilter = "any" | "healthy" | "penalty";

export type MasternodeFilters = {
  statuses: StatusBucket[];
  types: TypeBucket[];
  lastPaid: LastPaidWindow;
  pose: PoseFilter;
  country: string | null;
};

export const LAST_PAID_WINDOW_SEC: Record<LastPaidWindow, number | null> = {
  any: null,
  "24h": 86400,
  "7d": 604800,
  "30d": 2592000,
  "90d": 7776000,
  never: 0,
};

export const EMPTY_FILTERS: MasternodeFilters = {
  statuses: [],
  types: [],
  lastPaid: "any",
  pose: "any",
  country: null,
};

const LAST_PAID_OPTIONS: { value: LastPaidWindow; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "never", label: "Never paid" },
];

const POSE_OPTIONS: { value: PoseFilter; label: string }[] = [
  { value: "any", label: "Any PoSe" },
  { value: "healthy", label: "Healthy (score 0)" },
  { value: "penalty", label: "Has penalty" },
];

export function isFiltersActive(f: MasternodeFilters): boolean {
  return (
    f.statuses.length > 0 ||
    f.types.length > 0 ||
    f.lastPaid !== "any" ||
    f.pose !== "any" ||
    f.country !== null
  );
}

export function activeFilterCount(f: MasternodeFilters): number {
  let n = 0;
  if (f.statuses.length > 0) n += 1;
  if (f.types.length > 0) n += 1;
  if (f.lastPaid !== "any") n += 1;
  if (f.pose !== "any") n += 1;
  if (f.country !== null) n += 1;
  return n;
}

export function MasternodesFilterBar({
  filters,
  onChange,
  countryOptions,
}: {
  filters: MasternodeFilters;
  onChange: (next: MasternodeFilters) => void;
  countryOptions: { code: string; count: number }[];
}) {
  const active = activeFilterCount(filters);
  const set = <K extends keyof MasternodeFilters>(
    key: K,
    value: MasternodeFilters[K],
  ) => onChange({ ...filters, [key]: value });

  const lastPaidLabel = useMemo(
    () =>
      LAST_PAID_OPTIONS.find((o) => o.value === filters.lastPaid)?.label ??
      "Any time",
    [filters.lastPaid],
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-secondary/40 px-4 py-3 shadow-card sm:flex-row sm:items-center sm:flex-wrap",
        active > 0 && "ring-1 ring-accent/30",
      )}
    >
      <div className="flex items-center gap-2 pr-2 sm:border-r sm:border-border/60">
        <div className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent">
          <Filter className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Filters
          </span>
          <span className="font-mono text-xs tabular-nums text-foreground">
            {active === 0 ? "None active" : `${active} active`}
          </span>
        </div>
      </div>

      <FilterGroup label="Status" icon={<CircleCheck className="size-3.5" />}>
        <ToggleGroup
          type="multiple"
          value={filters.statuses}
          onValueChange={(v) => set("statuses", v as StatusBucket[])}
          variant="outline"
          size="sm"
          spacing={4}
        >
          <ToggleGroupItem
            value="enabled"
            aria-label="Enabled"
            className="data-[state=on]:bg-success/15 data-[state=on]:text-success data-[state=on]:border-success/40"
          >
            <CircleCheck className="size-3" />
            Enabled
          </ToggleGroupItem>
          <ToggleGroupItem
            value="banned"
            aria-label="Banned"
            className="data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive data-[state=on]:border-destructive/40"
          >
            <ServerCrash className="size-3" />
            Banned
          </ToggleGroupItem>
          <ToggleGroupItem value="other" aria-label="Other">
            Other
          </ToggleGroupItem>
        </ToggleGroup>
      </FilterGroup>

      <FilterGroup label="Type" icon={<Sparkles className="size-3.5" />}>
        <ToggleGroup
          type="multiple"
          value={filters.types}
          onValueChange={(v) => set("types", v as TypeBucket[])}
          variant="outline"
          size="sm"
          spacing={4}
        >
          <ToggleGroupItem value="regular" aria-label="Regular">
            Regular
          </ToggleGroupItem>
          <ToggleGroupItem
            value="evo"
            aria-label="Evo"
            className="data-[state=on]:bg-accent-violet/15 data-[state=on]:text-[color:var(--accent-violet)] data-[state=on]:border-[color:var(--accent-violet)]/40"
          >
            Evo
          </ToggleGroupItem>
        </ToggleGroup>
      </FilterGroup>

      <FilterGroup label="Last paid" icon={<Calendar className="size-3.5" />}>
        <Select
          value={filters.lastPaid}
          onValueChange={(v) => set("lastPaid", v as LastPaidWindow)}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-9 min-w-[150px]",
              filters.lastPaid !== "any" &&
                "border-accent/40 bg-accent/10 text-accent",
            )}
          >
            <SelectValue>{lastPaidLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LAST_PAID_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="PoSe" icon={<ShieldAlert className="size-3.5" />}>
        <Select
          value={filters.pose}
          onValueChange={(v) => set("pose", v as PoseFilter)}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-9 min-w-[140px]",
              filters.pose !== "any" &&
                "border-accent/40 bg-accent/10 text-accent",
            )}
          >
            <SelectValue>
              {POSE_OPTIONS.find((o) => o.value === filters.pose)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {POSE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Country" icon={<Globe2 className="size-3.5" />}>
        <CountryPicker
          value={filters.country}
          onChange={(v) => set("country", v)}
          options={countryOptions}
        />
      </FilterGroup>

      <div className="flex flex-1 items-center justify-end gap-2">
        {active > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function CountryPicker({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  options: { code: string; count: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);
  const sorted = useMemo(
    () => [...options].sort((a, b) => b.count - a.count),
    [options],
  );
  const filtered = useMemo(() => {
    if (!query) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        countryName(o.code).toLowerCase().includes(q),
    );
  }, [sorted, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 min-w-[160px] justify-between gap-2 font-normal",
            value && "border-accent/40 bg-accent/10 text-accent",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {value ? (
              <>
                <span aria-hidden="true">{countryFlagEmoji(value)}</span>
                <span className="truncate">{countryName(value)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">All countries</span>
            )}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0">
        <div className="flex flex-col">
          <div className="border-b border-border/60 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded-lg bg-secondary/50 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <ScrollArea className="h-[260px]">
            <div className="flex flex-col p-1">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                  value === null && "bg-accent/10 text-accent",
                )}
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Globe2 className="size-3.5" />
                  All countries
                </span>
              </button>
              {filtered.length === 0 && (
                <span className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No countries match
                </span>
              )}
              {filtered.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    onChange(opt.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                    value === opt.code && "bg-accent/10 text-accent",
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span aria-hidden="true">{countryFlagEmoji(opt.code)}</span>
                    <span className="truncate">{countryName(opt.code)}</span>
                  </span>
                  <Badge variant="soft" className="font-mono">
                    {opt.count}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
