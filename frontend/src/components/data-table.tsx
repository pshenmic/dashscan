import { Search } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headClassName?: string;
  align?: "left" | "right" | "center";
  width?: string | number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  toolbar?: ReactNode;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  className?: string;
  rowClassName?: (row: T) => string;
}

function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  rowKey,
  onRowClick,
  emptyTitle = "No results",
  emptyDescription,
  emptyIcon,
  search,
  toolbar,
  pagination,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 0;
  const pageList = pagination
    ? buildPageList(pagination.pageIndex, totalPages)
    : [];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {(search || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {search ? (
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Search…"}
                className="pl-9"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="hover:bg-secondary/50">
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.headClassName,
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && data.length === 0 ? (
              Array.from(
                { length: pagination?.pageSize ?? 10 },
                (_, i) => `skeleton-${i}`,
              ).map((key) => (
                <TableRow key={key} className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    icon={emptyIcon}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={rowKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className,
                      )}
                    >
                      {col.cell(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Page{" "}
              <span className="font-medium text-foreground">
                {pagination.pageIndex}
              </span>{" "}
              of {totalPages} · {pagination.total.toLocaleString()} total
            </span>
            {pagination.onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">Rows</span>
                <Select
                  value={String(pagination.pageSize)}
                  onValueChange={(v) =>
                    pagination.onPageSizeChange?.(Number(v))
                  }
                >
                  <SelectTrigger className="h-8 w-[78px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault();
                    if (pagination.pageIndex > 1)
                      pagination.onPageChange(pagination.pageIndex - 1);
                  }}
                  className={cn(
                    pagination.pageIndex <= 1 &&
                      "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>
              {pageList.map((p, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable position-based key
                <Fragment key={`${p}-${i}`}>
                  {p === "..." ? (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem>
                      <PaginationLink
                        isActive={p === pagination.pageIndex}
                        onClick={(e) => {
                          e.preventDefault();
                          pagination.onPageChange(p);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                </Fragment>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => {
                    e.preventDefault();
                    if (pagination.pageIndex < totalPages)
                      pagination.onPageChange(pagination.pageIndex + 1);
                  }}
                  className={cn(
                    pagination.pageIndex >= totalPages &&
                      "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
