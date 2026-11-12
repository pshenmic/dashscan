import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ApiMasternode } from "@/lib/api/types";
import { getIp } from "@/lib/format";
import { DataTable } from "./data-table";
import { IdentifierLink } from "./identifier-link";
import {
  MasternodeStatusBadge,
  MasternodeTypeBadge,
} from "./masternode-badges";

const columns: ColumnDef<ApiMasternode>[] = [
  {
    accessorKey: "address",
    header: "IP Address",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <img
          src="/icons/home/masternode.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
        <span className="dash-data-mono font-medium">
          {getIp(row.original.address)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "proTxHash",
    header: "ProTxHash",
    cell: ({ row }) => (
      <IdentifierLink value={row.original.proTxHash} kind="masternode" />
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <MasternodeTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <MasternodeStatusBadge status={row.original.status} />,
  },
];

export function HomeMasternodesTable({
  rows,
  busy,
  error,
}: {
  rows: ApiMasternode[];
  busy: boolean;
  error: boolean;
}) {
  const table = useReactTable({
    data: rows,
    columns,
    defaultColumn: { enableSorting: false },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (node) => node.proTxHash,
  });

  return (
    <DataTable
      table={table}
      variant="plain"
      growColumn="proTxHash"
      isFetching={busy}
      isEmpty={rows.length === 0}
      skeletonRows={6}
      skeletonWidths={["w-32", "w-full", "w-20", "w-16"]}
      caption="Masternodes matching the map selection"
      emptyMessage={
        error ? "Masternodes unavailable." : "No masternodes found."
      }
      className="min-w-[600px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5 [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_th[data-column=address]]:pl-12 [&_[data-column=type]]:text-right [&_[data-column=status]]:text-right [&_td]:h-12 [&_td]:tabular-nums"
    />
  );
}
