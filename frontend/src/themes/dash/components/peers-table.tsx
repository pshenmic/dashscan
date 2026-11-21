import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { countryFlagEmoji } from "@/components/explorer/geo/iso-codes";
import { Badge } from "@/components/explorer/ui/badge";
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
import { peerClientLabel } from "@/themes/dash/lib/network-metrics";
import { BlockAge } from "./block-age";
import { CopyButton } from "./copy-button";
import { DataTable } from "./data-table";

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
    header: "Country",
    cell: ({ row }) => <PeerCountry geo={row.original.geo} />,
  },
  {
    accessorKey: "address",
    header: "Peer address",
    cell: function AddressCell({ row: { original: peer } }) {
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
          {address}
          <CopyButton value={peer.address} label="Copy peer address" />
        </div>
      );
    },
  },
  {
    accessorKey: "available",
    header: "Status",
    cell: ({ row: { original: peer } }) => (
      <Badge variant={peer.available ? "soft-success" : "soft-destructive"}>
        {peer.available ? "Available" : "Unavailable"}
      </Badge>
    ),
  },
  {
    accessorKey: "userAgent",
    header: "User agent",
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
    header: "Protocol version",
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
}: {
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
  );
}
