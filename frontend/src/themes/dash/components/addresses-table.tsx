import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AddressRankingEntry } from "@/lib/api/address-ranking";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { AddressBalance } from "./address-balance";
import { DataTable } from "./data-table";
import { IdentifierLink } from "./identifier-link";

function valueShare(concentration: string | null | undefined) {
  if (!concentration || !/^\d+(\.\d+)?$/.test(concentration)) return "—";
  const value = Number(concentration);
  if (!Number.isFinite(value) || value > 100) return "—";
  return value > 0 && value < 0.01 ? "<0.01%" : `${metricNumber(value, 2)}%`;
}

export function AddressesTable({
  rows,
  usdPrice,
  order,
  onOrderChange,
  busy,
  emptyMessage,
  limit,
}: {
  rows: AddressRankingEntry[];
  usdPrice: number | null;
  order: "asc" | "desc";
  onOrderChange?: (next: "asc" | "desc") => void;
  busy: boolean;
  emptyMessage: string;
  limit: number;
}) {
  const columns: ColumnDef<AddressRankingEntry>[] = [
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) =>
        row.original.address ? (
          <IdentifierLink kind="address" value={row.original.address} />
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "balance",
      header: () =>
        !onOrderChange ? (
          "Balance (DASH)"
        ) : (
          <button
            type="button"
            className="rounded hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`Sort balance ${order === "desc" ? "lowest" : "highest"} first`}
            onClick={() => onOrderChange(order === "desc" ? "asc" : "desc")}
          >
            Balance (DASH){" "}
            <span aria-hidden="true">{order === "desc" ? "↓" : "↑"}</span>
          </button>
        ),
      cell: ({ row }) => (
        <AddressBalance balance={row.original.balance} usdPrice={usdPrice} />
      ),
    },
    {
      id: "share",
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="cursor-help rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              UTXO share
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 border bg-popover p-3 text-popover-foreground shadow-md">
            Address balance as a percentage of the network’s total UTXO value.
          </TooltipContent>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {valueShare(row.original.concentration)}
        </span>
      ),
    },
    {
      accessorKey: "txCount",
      header: "Transactions",
      cell: ({ row }) => metricNumber(row.original.txCount, 0),
    },
  ];
  const table = useReactTable({
    data: rows,
    columns,
    manualSorting: true,
    state: {
      sorting: onOrderChange ? [{ id: "balance", desc: order === "desc" }] : [],
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => row.address ?? String(index),
  });
  return (
    <div className="overflow-x-auto">
      <DataTable
        table={table}
        variant="lined"
        growColumn="address"
        className="min-w-[640px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5 [&_a.dash-data-mono]:text-accent [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_[data-column]:not([data-column=address])]:text-right [&_td]:tabular-nums"
        caption={
          onOrderChange
            ? "Addresses ranked by balance"
            : "Address search result"
        }
        isFetching={busy}
        isEmpty={rows.length === 0}
        emptyMessage={emptyMessage}
        skeletonRows={limit}
        skeletonWidths={["w-64", "w-28", "w-20", "w-24"]}
      />
    </div>
  );
}
