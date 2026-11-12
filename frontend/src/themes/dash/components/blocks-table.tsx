import { Link } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ApiBlock } from "@/lib/api/types";
import { BlockAge } from "@/themes/dash/components/block-age";
import { BlockColumnSearch } from "@/themes/dash/components/block-column-search";
import { DataTable } from "@/themes/dash/components/data-table";
import { IdentifierLink } from "@/themes/dash/components/identifier-link";
import { PendingColumnHeader } from "@/themes/dash/components/pending-column-header";
import {
  metricBytes,
  metricDuffs,
  metricNumber,
} from "@/themes/dash/lib/home-metrics";

const columns: ColumnDef<ApiBlock>[] = [
  {
    accessorKey: "height",
    enableSorting: true,
    header: ({ column }) => (
      <BlockColumnSearch
        kind="height"
        sorting={{
          order: column.getIsSorted() === "asc" ? "asc" : "desc",
          onChange: (order) => column.toggleSorting(order === "desc"),
        }}
      />
    ),
    cell: ({ row }) => (
      <Link
        to="/blocks/$hashOrHeight"
        params={{ hashOrHeight: row.original.hash }}
        className="flex items-center gap-2 text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <svg
          viewBox="0 0 24 24"
          width={24}
          height={24}
          aria-hidden="true"
          className="size-6 shrink-0 text-brand"
          fill="none"
        >
          <rect width="24" height="24" rx="12" className="fill-card" />
          <rect
            x="0.5"
            y="0.5"
            width="23"
            height="23"
            rx="11.5"
            stroke="currentColor"
            strokeOpacity="0.12"
          />
          <path
            d="M12 17.5L7 14.5385V9.46154L12 6.5L17 9.46154V14.5385L12 17.5ZM17 9.46154L12 12.4231M7 9.46154L12 12.4231M12 12.4231V17.5"
            strokeLinecap="round"
            stroke="currentColor"
          />
        </svg>
        {metricNumber(row.original.height, 0)}
      </Link>
    ),
  },
  {
    accessorKey: "hash",
    header: () => <BlockColumnSearch kind="hash" />,
    cell: ({ row }) => (
      <IdentifierLink kind="block" value={row.original.hash} />
    ),
  },
  {
    id: "miner",
    header: () => (
      <PendingColumnHeader
        label="Mined by"
        description="The block list does not include mining pool attribution. The attribution source and scope still need agreement."
      />
    ),
    cell: () => <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "txCount",
    header: () => (
      <PendingColumnHeader
        label="Txs"
        description="Transaction counts are available. Server-side filtering and sorting by transaction count are not supported; scope is not yet agreed."
      />
    ),
    cell: ({ row }) => metricNumber(row.original.txCount, 0),
  },
  {
    accessorKey: "fees",
    header: "Fees (DASH)",
    cell: ({ row }) => metricDuffs(row.original.fees),
  },
  {
    accessorKey: "size",
    header: () => (
      <PendingColumnHeader
        label="Size"
        description="Block sizes are available. Server-side filtering and sorting by size are not supported; scope is not yet agreed."
      />
    ),
    cell: ({ row }) => metricBytes(row.original.size),
  },
  {
    accessorKey: "difficulty",
    header: () => (
      <PendingColumnHeader
        label="Difficulty"
        description="Difficulty values are available. Server-side filtering and sorting by difficulty are not supported; scope is not yet agreed."
      />
    ),
    cell: ({ row }) => metricNumber(row.original.difficulty, 2),
  },
  {
    accessorKey: "timestamp",
    header: () => (
      <PendingColumnHeader
        label="Timestamp"
        description="Block timestamps are available. Server-side date filtering and timestamp sorting are not supported; scope is not yet agreed."
      />
    ),
    cell: ({ row }) => <BlockAge timestamp={row.original.timestamp} />,
  },
];

export function BlocksTable({
  blocks,
  busy,
  emptyMessage,
  order,
  onOrderChange,
}: {
  blocks: ApiBlock[];
  busy: boolean;
  emptyMessage: string;
  order: "asc" | "desc";
  onOrderChange: (order: "asc" | "desc") => void;
}) {
  const table = useReactTable({
    data: blocks,
    columns,
    defaultColumn: { enableSorting: false },
    manualSorting: true,
    enableSortingRemoval: false,
    enableMultiSort: false,
    state: { sorting: [{ id: "height", desc: order === "desc" }] },
    onSortingChange: (updater) => {
      const current = [{ id: "height", desc: order === "desc" }];
      const next = typeof updater === "function" ? updater(current) : updater;
      onOrderChange(next[0]?.desc ? "desc" : "asc");
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (block) => block.hash,
  });
  return (
    <div className="overflow-x-auto">
      <DataTable
        table={table}
        variant="plain"
        growColumn="hash"
        isFetching={busy}
        isEmpty={blocks.length === 0}
        emptyMessage={emptyMessage}
        caption={
          order === "desc"
            ? "Indexed blocks, highest first"
            : "Indexed blocks, lowest first"
        }
        className="min-w-[960px] text-sm leading-5 font-medium [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5 [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_[data-column=height]]:min-w-36 [&_[data-column=difficulty]]:min-w-44 [&_[data-column]:not([data-column=height]):not([data-column=hash])]:text-right [&_td]:tabular-nums"
      />
    </div>
  );
}
