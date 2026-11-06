import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { DataTable } from "./data-table";

export function LatestRecordsTable<Record extends { hash: string }>({
  rows,
  columns,
  busy,
  growColumn,
  caption,
  emptyMessage,
  highlightedHashes,
  className,
}: {
  rows: Record[];
  columns: ColumnDef<Record>[];
  busy: boolean;
  growColumn: string;
  caption: string;
  emptyMessage: string;
  highlightedHashes?: string[];
  className?: string;
}) {
  const table = useReactTable({
    data: rows,
    columns,
    defaultColumn: { enableSorting: false },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (record) => record.hash,
  });

  return (
    <div className="min-h-[404px] overflow-x-auto">
      <DataTable
        table={table}
        variant="plain"
        growColumn={growColumn}
        isFetching={busy}
        isEmpty={rows.length === 0}
        skeletonRows={6}
        skeletonWidths={columns.map(() => "w-full")}
        caption={caption}
        emptyMessage={emptyMessage}
        getRowProps={(record) => ({
          "data-new-block":
            highlightedHashes?.includes(record.hash) || undefined,
        })}
        className={cn(
          "min-w-[700px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_.dash-data-mono]:leading-5 [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_td]:h-12 [&_td]:tabular-nums",
          className,
        )}
      />
    </div>
  );
}
