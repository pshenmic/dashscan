import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { type ReactNode, useMemo, useState } from "react";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { blockListTableClassName, DataTable } from "./data-table";
import { LoadMore } from "./load-more";
import { Pagination } from "./pagination";

export function GovernanceTable<Row>({
  rows,
  columns,
  caption,
  growColumn,
  storageKey,
  searchLabel,
  searchText,
  busy = false,
  emptyMessage,
  controls,
  externalSearch,
  filterKey,
  initialSorting = [],
}: {
  rows: Row[];
  columns: ColumnDef<Row>[];
  caption: string;
  growColumn: string;
  storageKey: string;
  searchLabel: string;
  searchText: (row: Row) => string;
  busy?: boolean;
  emptyMessage: string;
  controls?: ReactNode;
  externalSearch?: string;
  filterKey?: string | null;
  initialSorting?: SortingState;
}) {
  const [mode, setMode] = useTableViewMode(storageKey, "pagination");
  const [localSearch, setSearch] = useState("");
  const search = externalSearch ?? localSearch;
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [previousFilters, setPreviousFilters] = useState({ search, filterKey });
  if (
    previousFilters.search !== search ||
    previousFilters.filterKey !== filterKey
  ) {
    setPreviousFilters({ search, filterKey });
    setPage(1);
  }
  const [size, setSize] = useState(10);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return externalSearch == null && query
      ? rows.filter((row) => searchText(row).toLowerCase().includes(query))
      : rows;
  }, [rows, search, searchText, externalSearch]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const table = useReactTable({
    data: filtered,
    columns,
    enableMultiSort: false,
    autoResetPageIndex: false,
    state: {
      sorting,
      pagination: {
        pageIndex: mode === "infinite" ? 0 : current - 1,
        pageSize: mode === "infinite" ? current * size : size,
      },
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {externalSearch == null && (
          <input
            type="search"
            aria-label={searchLabel}
            placeholder={searchLabel}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            className="min-h-10 w-56 max-w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        )}
        {controls}
        <fieldset
          aria-label="Loading mode"
          className="ml-auto inline-flex rounded-xl bg-secondary p-1"
        >
          {(["pagination", "infinite"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value);
                setPage(1);
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground aria-pressed:bg-card aria-pressed:text-accent"
            >
              {value === "pagination" ? "Pages" : "Scroll"}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="relative overflow-x-auto">
        <DataTable
          table={table}
          variant="plain"
          className={`${blockListTableClassName} min-w-[680px] [&_[data-column=paymentAmount]]:text-right [&_[data-column=absoluteYesCount]]:text-right [&_[data-column=yesCount]]:text-right [&_[data-column=noCount]]:text-right [&_[data-column=abstainCount]]:text-right`}
          caption={caption}
          growColumn={growColumn}
          isFetching={busy}
          isEmpty={!rows.length}
          skeletonWidths={columns.map(() => "w-16")}
          emptyMessage={
            search && rows.length ? "No matching results." : emptyMessage
          }
        />
      </div>
      {filtered.length > 0 &&
        (mode === "pagination" ? (
          <nav
            aria-label={`${caption} pagination`}
            className="mt-4 overflow-x-auto"
          >
            <Pagination
              page={current}
              pageCount={pages}
              pageSize={size}
              align="end"
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setSize(value);
                setPage(1);
              }}
            />
          </nav>
        ) : (
          current < pages && (
            <LoadMore
              loading={false}
              failed={false}
              onLoad={() => setPage(current + 1)}
            />
          )
        ))}
    </div>
  );
}
