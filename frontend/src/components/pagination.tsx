import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  const pageIndex = page - 1;

  const pages: (number | string)[] = [];
  if (pageCount <= 7) {
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
    <div className="flex justify-center px-6 pb-4 pt-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
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
              onClick={() => onPageChange(p + 1)}
              className={`${btnBase} ${p === pageIndex ? "border-accent bg-accent text-accent-foreground" : "hover:bg-accent/10"}`}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={`${btnBase} hover:bg-accent/10 disabled:opacity-40`}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
