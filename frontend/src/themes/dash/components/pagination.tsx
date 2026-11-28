import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageSize } from "@/lib/pagination";
import { PageSizeSelect } from "@/themes/dash/components/page-size-select";

interface PaginationProps {
  page: number;
  pageCount?: number;
  hasNextPage?: boolean;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: PageSize) => void;
  align?: "center" | "end";
}

export function Pagination({
  page,
  pageCount,
  hasNextPage,
  disabled = false,
  onPageChange,
  pageSize,
  onPageSizeChange,
  align = "center",
}: PaginationProps) {
  const pageIndex = page - 1;

  const pages: (number | string)[] = [];
  if (pageCount == null) {
    if (page > 1) pages.push(0);
    if (page > 2) pages.push("ellipsis-start");
    if (page > 1) pages.push(pageIndex);
    else pages.push(0);
  } else if (pageCount <= 7) {
    for (let p = 0; p < pageCount; p++) pages.push(p);
  } else {
    pages.push(0);
    if (pageIndex > 2) pages.push("ellipsis-start");
    const start = Math.max(1, pageIndex - 1);
    const end = Math.min(pageCount - 2, pageIndex + 1);
    for (let p = start; p <= end; p++) pages.push(p);
    if (pageIndex < pageCount - 3) pages.push("ellipsis-end");
    pages.push(pageCount - 1);
  }

  const btnBase =
    "flex h-9 items-center justify-center rounded-lg border border-border px-[18px] text-xs font-medium transition-colors";

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-2 pb-4 pt-2 sm:px-6 ${align === "end" ? "justify-between" : "justify-center"}`}
    >
      {pageSize != null && onPageSizeChange && (
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
      )}
      <div
        className={`flex flex-1 basis-full flex-wrap items-center justify-center gap-1 sm:basis-auto ${align === "end" ? "sm:justify-end" : ""}`}
      >
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className={`${btnBase} hover:bg-accent/10 disabled:opacity-40`}
        >
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((p) =>
          typeof p === "string" ? (
            <span key={p} className={`${btnBase} text-muted-foreground`}>
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p + 1}`}
              aria-current={p === pageIndex ? "page" : undefined}
              disabled={disabled}
              onClick={() => onPageChange(p + 1)}
              className={`${btnBase} ${p === pageIndex ? "border-accent bg-accent text-accent-foreground" : "hover:bg-accent/10"}`}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
          disabled={
            disabled || (pageCount == null ? !hasNextPage : page >= pageCount)
          }
          className={`${btnBase} hover:bg-accent/10 disabled:opacity-40`}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
