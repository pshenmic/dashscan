import { flexRender, type Table } from "@tanstack/react-table";
import { SkeletonRow } from "@/components/skeleton";

interface DataTableProps<T> {
  table: Table<T>;
  isFetching: boolean;
  isEmpty: boolean;
  skeletonWidths: string[];
  skeletonRows?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  table,
  isFetching,
  isEmpty,
  skeletonWidths,
  skeletonRows = 10,
  emptyMessage = "No results found.",
  onRowClick,
}: DataTableProps<T>) {
  return (
    <table
      className="w-full text-xs"
      style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}
    >
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="px-3 pb-2 text-left font-medium text-foreground"
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {isFetching && isEmpty ? (
          Array.from({ length: skeletonRows }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
            <SkeletonRow key={i} widths={skeletonWidths} index={i} />
          ))
        ) : table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="group cursor-pointer transition-colors"
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell, i, cells) => {
                const isFirst = i === 0;
                const isLast = i === cells.length - 1;
                return (
                  <td
                    key={cell.id}
                    className={`border-y border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10 ${isFirst ? "rounded-l-xl border-l overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent before:opacity-0 before:transition-opacity before:duration-150 group-hover:before:opacity-100 relative" : ""} ${isLast ? "rounded-r-xl border-r" : ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan={table.getAllColumns().length}
              className="px-6 py-10 text-center text-muted-foreground"
            >
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
