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
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { DataTable } from "./data-table";
import { IdentifierLink } from "./identifier-link";

function valueShare(
  balance: string | null | undefined,
  total: string | undefined,
) {
  if (!balance || !total || !/^\d+$/.test(balance) || !/^\d+$/.test(total))
    return "—";
  const amount = BigInt(balance);
  const denominator = BigInt(total);
  if (denominator <= 0n || amount > denominator) return "—";
  if (amount === 0n) return "0%";
  const scaled = (amount * 1_000_000n) / denominator;
  return scaled === 0n
    ? "<0.0001%"
    : `${metricNumber(Number(scaled) / 10_000, 4)}%`;
}

export function AddressesTable({
  rows,
  totalAmountDuffs,
  busy,
  emptyMessage,
  limit,
}: {
  rows: AddressRankingEntry[];
  totalAmountDuffs?: string;
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
      header: "Balance (DASH)",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums text-accent">
          {metricDuffs(row.original.balance, 8)}
        </span>
      ),
    },
    {
      accessorKey: "txCount",
      header: "Transactions",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {metricNumber(row.original.txCount, 0)}
        </span>
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
              UTXO value share
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 border bg-popover p-3 text-popover-foreground shadow-md">
            Estimated address balance as a share of the network UTXO value.
            Balances may include unconfirmed transactions; the network total is
            a separate block snapshot.
          </TooltipContent>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {valueShare(row.original.balance, totalAmountDuffs)}
        </span>
      ),
    },
  ];
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => row.address ?? String(index),
  });
  return (
    <div className="overflow-x-auto">
      <DataTable
        table={table}
        variant="plain"
        growColumn="address"
        className="[&_th:not([data-column=address])]:text-right [&_td:not([data-column=address])]:text-right"
        caption="Indexed addresses"
        isFetching={busy}
        isEmpty={rows.length === 0}
        emptyMessage={emptyMessage}
        skeletonRows={limit}
        skeletonWidths={["w-64", "w-28", "w-20", "w-24"]}
      />
    </div>
  );
}
