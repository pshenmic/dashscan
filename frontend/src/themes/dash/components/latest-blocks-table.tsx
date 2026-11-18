import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import type { ApiBlock } from "@/lib/api/types";
import { metricBytes, metricNumber } from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";
import { IdentifierLink } from "./identifier-link";
import { LatestRecordsTable } from "./latest-records-table";

const columns: ColumnDef<ApiBlock>[] = [
  {
    accessorKey: "height",
    header: "Height",
    cell: ({ row }) => (
      <Link
        to="/blocks/$hashOrHeight"
        params={{ hashOrHeight: row.original.hash }}
        className="flex items-center gap-2 whitespace-nowrap text-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <img
          src="/icons/home/block.svg"
          alt=""
          width={24}
          height={24}
          className="size-6 shrink-0"
        />
        {metricNumber(row.original.height, 0)}
      </Link>
    ),
  },
  {
    accessorKey: "hash",
    header: "Block Hash",
    cell: ({ row }) => (
      <IdentifierLink kind="block" value={row.original.hash} />
    ),
  },
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ row }) => metricBytes(row.original.size),
  },
  {
    accessorKey: "txCount",
    header: "Txs",
    cell: ({ row }) => metricNumber(row.original.txCount, 0),
  },
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => <BlockAge timestamp={row.original.timestamp} />,
  },
];

export function LatestBlocksTable({
  blocks,
  busy,
  error,
  highlightedHashes,
}: {
  blocks: ApiBlock[];
  busy: boolean;
  error: boolean;
  highlightedHashes: string[];
}) {
  return (
    <LatestRecordsTable
      rows={blocks.slice(0, 6)}
      columns={columns}
      busy={busy}
      growColumn="hash"
      highlightedHashes={highlightedHashes}
      caption="Recently mined blocks, highest first"
      emptyMessage={error ? "Block data unavailable" : "No blocks found."}
      className="[&_[data-column=height]]:min-w-36 [&_[data-column]:not([data-column=height]):not([data-column=hash])]:text-right"
    />
  );
}
