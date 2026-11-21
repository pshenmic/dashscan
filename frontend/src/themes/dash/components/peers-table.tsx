import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import { createContext, useContext } from "react";
import { countryFlagEmoji } from "@/components/explorer/geo/iso-codes";
import {
  PeerColumnPicker,
  type PeerStatusFilter,
} from "@/components/explorer/peers-filter-bar";
import { Badge } from "@/components/explorer/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { type ApiPeer, decodeServices } from "@/lib/api/peers";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  peerClientLabel,
  peerLocation,
} from "@/themes/dash/lib/network-metrics";
import { BlockAge } from "./block-age";
import { CopyButton } from "./copy-button";
import { DataTable } from "./data-table";

type FilterControls = {
  onLocate: (peer: ApiPeer) => void;
  countryPicker: React.ComponentProps<typeof PeerColumnPicker>["options"];
  agentPicker: React.ComponentProps<typeof PeerColumnPicker>["options"];
  country: string | null;
  userAgent: string | null;
  onCountryChange: (value: string | null) => void;
  onAgentChange: (value: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
  protocol: string;
  onProtocolChange: (value: string) => void;
  status: PeerStatusFilter;
  onStatusChange: (status: PeerStatusFilter) => void;
};
const FilterContext = createContext<FilterControls | null>(null);
const triggerClass =
  "inline-flex items-center gap-1 rounded-md px-1 hover:bg-action-subtle hover:text-accent focus-visible:outline-2 focus-visible:outline-ring data-[active=true]:text-accent";

function SearchHeader({ protocol = false }: { protocol?: boolean }) {
  const control = useContext(FilterContext);
  const label = protocol ? "Protocol version" : "Peer address";
  if (!control) return label;
  const value = protocol ? control.protocol : control.search;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          data-active={!!value}
          aria-label={`Filter: ${label}`}
        >
          {label}
          <ChevronDown aria-hidden="true" className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 rounded-xl p-2">
        <Input
          type="search"
          inputMode={protocol ? "numeric" : "search"}
          value={value}
          aria-label={`Search ${label}`}
          placeholder={protocol ? "Protocol version…" : "Address or location…"}
          onChange={(event) =>
            (protocol ? control.onProtocolChange : control.onSearchChange)(
              event.target.value,
            )
          }
        />
      </PopoverContent>
    </Popover>
  );
}

function ChoiceHeader({ country = false }: { country?: boolean }) {
  const control = useContext(FilterContext);
  const label = country ? "Country" : "User agent";
  if (!control) return label;
  return (
    <PeerColumnPicker
      label={label}
      plural={country ? "countries" : "user agents"}
      className={triggerClass}
      value={country ? control.country : control.userAgent}
      options={country ? control.countryPicker : control.agentPicker}
      onChange={country ? control.onCountryChange : control.onAgentChange}
    />
  );
}

function StatusHeader() {
  const control = useContext(FilterContext);
  if (!control) return "Status";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by status: ${control.status}`}
          className={triggerClass}
          data-active={control.status !== "all"}
        >
          Status <ChevronDown aria-hidden="true" className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-xl">
        <DropdownMenuRadioGroup
          value={control.status}
          onValueChange={(value) => {
            if (
              value === "all" ||
              value === "available" ||
              value === "unavailable"
            )
              control.onStatusChange(value);
          }}
        >
          <DropdownMenuRadioItem value="all">
            All statuses
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="available">
            <Badge variant="soft-success">Available</Badge>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="unavailable">
            <Badge variant="soft-destructive">Unavailable</Badge>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const regionNames = new Intl.DisplayNames("en", {
  type: "region",
  fallback: "none",
});

function PeerCountry({ geo }: { geo: ApiPeer["geo"] }) {
  const code = geo?.countryCode.trim().toUpperCase() ?? "";
  const name =
    /^[A-Z]{2}$/.test(code) && code !== "ZZ" ? regionNames.of(code) : undefined;
  if (!name)
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Unknown country</span>
      </>
    );
  const city = geo?.city?.trim();
  const country = (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden="true" className="text-lg leading-none">
        {countryFlagEmoji(code)}
      </span>
      {name}
    </span>
  );
  if (!city) return country;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-7 items-center gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
        >
          {country}
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="max-w-[12ch] truncate text-muted-foreground lg:max-w-[16ch]">
            {city}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 break-words">{city}</TooltipContent>
    </Tooltip>
  );
}

const columns: ColumnDef<ApiPeer>[] = [
  {
    id: "country",
    header: () => <ChoiceHeader country />,
    cell: ({ row }) => <PeerCountry geo={row.original.geo} />,
  },
  {
    accessorKey: "address",
    header: () => <SearchHeader />,
    cell: function AddressCell({ row: { original: peer } }) {
      const control = useContext(FilterContext);
      const suffix = `:${peer.port}`;
      const hasPort =
        peer.address !== peer.host && peer.address.endsWith(suffix);
      const address = (
        <span className="whitespace-nowrap font-mono text-sm">
          {hasPort ? peer.address.slice(0, -suffix.length) : peer.address}
          {hasPort && <span className="text-muted-foreground">{suffix}</span>}
        </span>
      );
      return (
        <div className="inline-flex items-center gap-1.5">
          {control && peerLocation(peer) ? (
            <button
              type="button"
              aria-label={`Show ${peer.address} on map`}
              title="Show on map"
              onClick={() => control.onLocate(peer)}
              className="rounded-sm text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {address}
            </button>
          ) : (
            address
          )}
          <CopyButton value={peer.address} label="Copy peer address" />
        </div>
      );
    },
  },
  {
    accessorKey: "available",
    header: StatusHeader,
    cell: ({ row: { original: peer } }) => (
      <Badge variant={peer.available ? "soft-success" : "soft-destructive"}>
        {peer.available ? "Available" : "Unavailable"}
      </Badge>
    ),
  },
  {
    accessorKey: "userAgent",
    header: () => <ChoiceHeader />,
    cell: ({ row: { original: peer } }) =>
      peer.userAgent ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="block max-w-64 truncate rounded-sm text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {peerClientLabel(peer.userAgent)}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 break-all">
            {peer.userAgent}
          </TooltipContent>
        </Tooltip>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "protocolVersion",
    header: () => <SearchHeader protocol />,
    cell: ({ row: { original: peer } }) => (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Peer details for ${peer.address}, protocol ${peer.protocolVersion ?? "unknown"}`}
            className="rounded-sm underline decoration-dotted underline-offset-4 focus-visible:outline-ring"
          >
            {peer.protocolVersion ?? "—"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 rounded-xl text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            <dt>Services</dt>
            <dd>
              {peer.services == null
                ? "—"
                : [
                    ...decodeServices(peer.services).names,
                    ...decodeServices(peer.services).unknownBits.map(
                      (bit) => `bit ${bit}`,
                    ),
                  ].join(", ") || "None"}
            </dd>
            <dt>Start height</dt>
            <dd>
              {peer.startHeight == null ? "—" : formatNumber(peer.startHeight)}
            </dd>
            <dt>Last probed</dt>
            <dd>{peer.probedAt ? formatDateTime(peer.probedAt) : "—"}</dd>
          </dl>
        </PopoverContent>
      </Popover>
    ),
  },
  {
    accessorKey: "lastSeen",
    header: "Last seen",
    cell: ({ row }) =>
      row.original.lastSeen ? (
        <BlockAge timestamp={row.original.lastSeen} />
      ) : (
        "—"
      ),
  },
];

export function PeersTable({
  rows,
  busy,
  emptyMessage,
  ...controls
}: FilterControls & {
  rows: ApiPeer[];
  busy: boolean;
  emptyMessage: string;
}) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (peer) => peer.address,
  });
  return (
    <FilterContext.Provider value={controls}>
      <div className="overflow-x-auto">
        <DataTable
          table={table}
          variant="plain"
          growColumn="address"
          caption="Network peers"
          isFetching={busy}
          isEmpty={!rows.length}
          skeletonWidths={["w-24", "w-40", "w-20", "w-32", "w-16", "w-16"]}
          emptyMessage={emptyMessage}
          className="min-w-[680px] text-sm font-medium leading-5 [&_tr>*]:border-y [&_tr>*]:border-border [&_tr>*]:bg-card [&_tr>:first-child]:rounded-l-xl [&_tr>:first-child]:border-l [&_tr>:last-child]:rounded-r-xl [&_tr>:last-child]:border-r [&_th]:py-3 [&_th]:font-semibold [&_[data-column=protocolVersion]]:text-right [&_[data-column=lastSeen]]:text-right [&_td]:tabular-nums [&_tr:focus-within_td]:bg-surface-subtle hover:[&_tbody_tr:hover_td]:bg-surface-subtle"
        />
      </div>
    </FilterContext.Provider>
  );
}
