import { flexRender, type Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/themes/dash/components/skeleton";

interface DataTableProps<T> {
  table: Table<T>;
  isFetching: boolean;
  isEmpty: boolean;
  skeletonWidths?: string[];
  skeletonRows?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  borderless?: boolean;
  variant?: "default" | "plain";
  growColumn?: string;
  caption?: string;
  className?: string;
  getRowProps?: (row: T) => { "data-new-block"?: boolean };
}

export function DataTable<T>({
  table,
  isFetching,
  isEmpty,
  skeletonWidths = [],
  skeletonRows = 10,
  emptyMessage = "No results found.",
  onRowClick,
  borderless = false,
  variant = "default",
  growColumn,
  caption,
  className,
  getRowProps,
}: DataTableProps<T>) {
  const plain = variant === "plain";
  return (
    <table
      aria-busy={isFetching}
      className={cn(
        "w-full text-xs",
        plain &&
          "dash-home-table table-auto text-left [&_td:not([data-grow])]:w-px [&_td:not([data-grow])]:whitespace-nowrap [&_td[data-grow]]:min-w-40",
        className,
      )}
      style={{
        borderCollapse: "separate",
        borderSpacing: plain ? "0 8px" : "0 6px",
      }}
    >
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                data-column={header.column.id}
                scope="col"
                aria-sort={
                  header.column.getIsSorted() === "desc"
                    ? "descending"
                    : header.column.getIsSorted() === "asc"
                      ? "ascending"
                      : undefined
                }
                className={cn(
                  "px-3 pb-2 text-left font-medium text-foreground",
                  plain && "whitespace-nowrap",
                )}
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
        {isFetching && isEmpty && skeletonWidths.length > 0 ? (
          Array.from({ length: skeletonRows }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
            <SkeletonRow key={index} widths={skeletonWidths} index={index} />
          ))
        ) : table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <tr
              {...getRowProps?.(row.original)}
              key={row.id}
              className={
                plain
                  ? "bg-secondary/60"
                  : "group cursor-pointer transition-colors"
              }
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell, index, cells) => {
                const isFirst = index === 0;
                const isLast = index === cells.length - 1;
                return (
                  <td
                    key={cell.id}
                    data-column={cell.column.id}
                    data-grow={cell.column.id === growColumn || undefined}
                    className={
                      plain
                        ? cn(
                            "px-3 py-3",
                            isFirst && "rounded-l-xl",
                            isLast && "rounded-r-xl",
                          )
                        : `${borderless ? "" : "border-y border-border"} bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10 ${isFirst ? `rounded-l-xl ${borderless ? "" : "border-l"} overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent before:opacity-0 before:transition-opacity before:duration-150 group-hover:before:opacity-100 relative` : ""} ${isLast ? `rounded-r-xl ${borderless ? "" : "border-r"}` : ""}`
                    }
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
              colSpan={table.getVisibleLeafColumns().length}
              className={cn(
                "px-6 py-10 text-center text-muted-foreground",
                plain && "h-44",
              )}
            >
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
