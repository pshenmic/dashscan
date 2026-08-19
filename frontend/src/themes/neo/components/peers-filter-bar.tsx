import {
  Check,
  ChevronDown,
  CircleCheck,
  Filter,
  Globe,
  MapPin,
  Network,
  Search,
  ServerCrash,
  Waypoints,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type ApiPeerUserAgent, isValidIpv4 } from "@/lib/api/peers";
import { cn } from "@/lib/utils";
import {
  countryFlagEmoji,
  countryName,
} from "@/themes/neo/components/masternode-map/iso-codes";
import { Badge } from "@/themes/neo/components/ui/badge";

export type PeerStatusFilter = "all" | "available" | "unavailable";

export type PeerFilters = {
  status: PeerStatusFilter;
  country: string | null;
  userAgent: string | null;
  ip: string | null;
};

export const EMPTY_PEER_FILTERS: PeerFilters = {
  status: "all",
  country: null,
  userAgent: null,
  ip: null,
};

function activeFilterCount(filters: PeerFilters, search: string): number {
  let count = search.trim() ? 1 : 0;
  if (filters.status !== "all") count += 1;
  if (filters.country) count += 1;
  if (filters.userAgent) count += 1;
  if (filters.ip) count += 1;
  return count;
}

export function PeersFilterBar({
  filters,
  search,
  userAgents,
  total,
  filteredTotal,
  onFiltersChange,
  onSearchChange,
  onClear,
}: {
  filters: PeerFilters;
  search: string;
  userAgents: ApiPeerUserAgent[];
  total: number;
  filteredTotal: number;
  onFiltersChange: (next: PeerFilters) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}) {
  const ipErrorId = useId();
  const [ipDraft, setIpDraft] = useState(filters.ip ?? "");
  const [ipTouched, setIpTouched] = useState(false);
  const active = activeFilterCount(filters, search);
  const normalizedIp = ipDraft.trim();
  const ipInvalid =
    normalizedIp !== "" &&
    !isValidIpv4(normalizedIp) &&
    (ipTouched || normalizedIp.split(".").length === 4);
  const set = <K extends keyof PeerFilters>(key: K, value: PeerFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  useEffect(() => {
    if (filters.ip !== null && filters.ip !== ipDraft) setIpDraft(filters.ip);
    if (filters.ip === null && isValidIpv4(ipDraft.trim())) setIpDraft("");
  }, [filters.ip, ipDraft]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-secondary/40 px-4 py-3 shadow-card xl:flex-row xl:items-end xl:flex-wrap",
        active > 0 && "ring-1 ring-accent/30",
      )}
    >
      <div className="flex items-center gap-2 pr-2 xl:border-r xl:border-border/60 xl:pb-0.5">
        <div className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent">
          <Filter className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Peer filters
          </span>
          <span className="font-mono text-xs tabular-nums text-foreground">
            {active === 0 ? "None active" : `${active} active`}
          </span>
        </div>
      </div>

      <FilterGroup label="Search" icon={<Search />}>
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search peers"
          placeholder="Address or location…"
          className="h-9 min-w-[210px] xl:w-[250px]"
        />
      </FilterGroup>

      <FilterGroup label="Status" icon={<CircleCheck />}>
        <ToggleGroup
          type="single"
          value={filters.status}
          onValueChange={(value) =>
            value && set("status", value as PeerStatusFilter)
          }
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="all" aria-label="All peers">
            <Globe />
            All
          </ToggleGroupItem>
          <ToggleGroupItem
            value="available"
            aria-label="Available peers"
            className="data-[state=on]:border-success/40 data-[state=on]:bg-success/15 data-[state=on]:text-success"
          >
            <CircleCheck />
            Available
          </ToggleGroupItem>
          <ToggleGroupItem
            value="unavailable"
            aria-label="Unavailable peers"
            className="data-[state=on]:border-destructive/40 data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive"
          >
            <ServerCrash />
            Unavailable
          </ToggleGroupItem>
        </ToggleGroup>
      </FilterGroup>

      <FilterGroup label="User agent" icon={<Waypoints />}>
        <UserAgentPicker
          value={filters.userAgent}
          options={userAgents}
          onChange={(value) => set("userAgent", value)}
        />
      </FilterGroup>

      <FilterGroup label="Exact IPv4" icon={<Network />}>
        <div className="flex flex-col gap-1">
          <Input
            value={ipDraft}
            onChange={(event) => {
              const next = event.target.value;
              const normalized = next.trim();
              setIpDraft(next);
              set("ip", isValidIpv4(normalized) ? normalized : null);
            }}
            onBlur={() => setIpTouched(true)}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            aria-label="Exact IPv4 address"
            aria-invalid={ipInvalid}
            aria-describedby={ipInvalid ? ipErrorId : undefined}
            placeholder="203.0.113.42"
            className="h-9 font-mono xl:w-[170px]"
          />
          {ipInvalid && (
            <span id={ipErrorId} className="text-[10px] text-destructive">
              Enter a complete IPv4 address
            </span>
          )}
        </div>
      </FilterGroup>

      {filters.country && (
        <FilterGroup label="Map country" icon={<MapPin />}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 border-accent/40 bg-accent/10 text-accent"
            onClick={() => set("country", null)}
          >
            <span aria-hidden="true">{countryFlagEmoji(filters.country)}</span>
            {countryName(filters.country)}
            <X data-icon="inline-end" />
          </Button>
        </FilterGroup>
      )}

      <div className="flex flex-1 items-center justify-between gap-3 xl:justify-end xl:pb-0.5">
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
          <span className="text-foreground">
            {filteredTotal.toLocaleString()}
          </span>
          {active > 0 && ` of ${total.toLocaleString()}`} peers
        </span>
        {active > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIpDraft("");
              setIpTouched(false);
              onClear();
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X data-icon="inline-start" />
            Reset
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
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function UserAgentPicker({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: ApiPeerUserAgent[];
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-label="Filter by user agent"
          aria-expanded={open}
          className={cn(
            "h-9 w-full min-w-[220px] justify-between font-normal xl:w-[250px]",
            value && "border-accent/40 bg-accent/10 text-accent",
          )}
        >
          <span className="truncate font-mono text-xs">
            {value ?? "All user agents"}
          </span>
          <ChevronDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search user agents…" />
          <CommandList>
            <CommandEmpty>No user agents found.</CommandEmpty>
            <CommandGroup heading="User agents">
              <CommandItem
                value="all-user-agents"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn(value !== null && "opacity-0")} />
                <span className="flex-1">All user agents</span>
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.userAgent}
                  value={option.userAgent}
                  onSelect={() => {
                    onChange(option.userAgent);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(value !== option.userAgent && "opacity-0")}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {option.userAgent}
                  </span>
                  <Badge variant="soft" className="font-mono tabular-nums">
                    {option.count.toLocaleString()}
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
