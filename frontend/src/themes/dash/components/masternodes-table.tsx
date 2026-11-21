import { useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, X } from "lucide-react";
import { type ReactNode, useCallback, useId, useMemo, useState } from "react";
import { RelativeTime } from "@/components/relative-time";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApiMasternode } from "@/lib/api/types";
import {
  formatDateTime,
  getIp,
  getMnStatusLabel,
  getMnTypeLabel,
} from "@/lib/format";
import type { PageSize } from "@/lib/pagination";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { ColumnSearch } from "./column-search";
import { DataTable } from "./data-table";
import { IdentifierLink } from "./identifier-link";
import { LoadMore } from "./load-more";
import {
  MasternodeStatusBadge,
  MasternodeTypeBadge,
} from "./masternode-badges";
import { Pagination } from "./pagination";

export interface MasternodeFilters {
  ip: string;
  hash: string | undefined;
  type: string;
  status: string;
}

function ColumnFilter({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Popover>
      <span className="inline-flex items-center gap-1">
        {label}
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Filter: ${label}`}
            className={`inline-flex size-6 items-center justify-center rounded-md hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring ${active ? "bg-action-subtle text-accent" : "text-muted-foreground"}`}
          >
            <ChevronDown className="size-3" aria-hidden="true" />
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent align="start" className="w-56 rounded-xl p-3">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function FilterOptions({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset
      aria-label={label}
      className="grid max-h-64 gap-1 overflow-y-auto"
    >
      {[{ value: "all", label: "All" }, ...options].map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary aria-pressed:bg-action-subtle aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

export function MasternodesTable({
  nodes,
  allNodes,
  page,
  limit,
  fetching,
  failed,
  filters,
  selectionKey,
  onFiltersChange,
}: {
  nodes: ApiMasternode[];
  allNodes: ApiMasternode[];
  page: number;
  limit: PageSize;
  fetching: boolean;
  failed: boolean;
  filters: MasternodeFilters;
  selectionKey: string;
  onFiltersChange: (filters: MasternodeFilters) => void;
}) {
  const navigate = useNavigate({ from: "/masternodes/" });
  const headingId = useId();
  const [storedMode, setMode] = useTableViewMode(
    "dash-masternodes",
    "pagination",
  );
  const mode = page > 1 ? "pagination" : storedMode;
  const filterKey = JSON.stringify([filters, selectionKey, limit]);
  const [window, setWindow] = useState({
    key: filterKey,
    count: limit as number,
  });
  const visibleCount = window.key === filterKey ? window.count : limit;
  const pageCount = Math.max(1, Math.ceil(nodes.length / limit));
  const currentPage = Math.min(page, pageCount);
  const rows = useMemo(
    () =>
      mode === "infinite"
        ? nodes.slice(0, visibleCount)
        : nodes.slice((currentPage - 1) * limit, currentPage * limit),
    [mode, nodes, visibleCount, currentPage, limit],
  );
  const loadMore = useCallback(
    () =>
      setWindow({
        key: filterKey,
        count: Math.min(visibleCount + limit, nodes.length),
      }),
    [filterKey, visibleCount, limit, nodes.length],
  );
  const types = useMemo(
    () =>
      [...new Set(allNodes.map((node) => node.type))]
        .sort()
        .map((value) => ({ value, label: getMnTypeLabel(value) })),
    [allNodes],
  );
  const statuses = useMemo(
    () =>
      [...new Set(allNodes.map((node) => node.status))]
        .sort()
        .map((value) => ({ value, label: getMnStatusLabel(value) })),
    [allNodes],
  );
  const columns = useMemo<ColumnDef<ApiMasternode>[]>(
    () => [
      {
        accessorKey: "address",
        header: () => (
          <ColumnFilter label="IP address" active={filters.ip !== ""}>
            <label className="block text-xs text-muted-foreground">
              IP address
              <input
                value={filters.ip}
                onChange={(event) =>
                  onFiltersChange({ ...filters, ip: event.target.value.trim() })
                }
                autoComplete="off"
                spellCheck={false}
                placeholder="IP address…"
                className="mt-2 w-full rounded-lg border border-input bg-secondary px-2 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </ColumnFilter>
        ),
        cell: ({ row }) => (
          <span title={row.original.address} className="dash-data-mono">
            {getIp(row.original.address)}
          </span>
        ),
      },
      {
        accessorKey: "proTxHash",
        header: () => (
          <ColumnSearch
            kind="hash"
            label="ProTxHash"
            activeValue={filters.hash}
            onChange={(hash) => onFiltersChange({ ...filters, hash })}
          />
        ),
        cell: ({ row }) => (
          <IdentifierLink kind="masternode" value={row.original.proTxHash} />
        ),
      },
      {
        accessorKey: "type",
        header: () => (
          <ColumnFilter label="Type" active={filters.type !== "all"}>
            <FilterOptions
              label="Masternode type"
              value={filters.type}
              options={types}
              onChange={(type) => onFiltersChange({ ...filters, type })}
            />
          </ColumnFilter>
        ),
        cell: ({ row }) => <MasternodeTypeBadge type={row.original.type} />,
      },
      {
        accessorKey: "status",
        header: () => (
          <ColumnFilter label="Status" active={filters.status !== "all"}>
            <FilterOptions
              label="Masternode status"
              value={filters.status}
              options={statuses}
              onChange={(status) => onFiltersChange({ ...filters, status })}
            />
          </ColumnFilter>
        ),
        cell: ({ row }) => (
          <MasternodeStatusBadge status={row.original.status} />
        ),
      },
      {
        accessorKey: "posPenaltyScore",
        header: "PoSe penalty",
        cell: ({ row }) => metricNumber(row.original.posPenaltyScore, 0),
      },
      {
        accessorKey: "lastPaidTime",
        header: "Last paid",
        cell: ({ row }) => {
          const { lastPaidBlock, lastPaidTime } = row.original;
          if (lastPaidBlock === 0)
            return <span className="text-muted-foreground">Never</span>;
          if (
            !lastPaidTime ||
            !Number.isFinite(Date.parse(lastPaidTime)) ||
            Date.parse(lastPaidTime) <= 0
          )
            return "—";
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-block min-w-24 rounded text-right text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <time dateTime={lastPaidTime}>
                    <RelativeTime timestamp={lastPaidTime} />
                  </time>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {formatDateTime(new Date(lastPaidTime))}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
    ],
    [filters, onFiltersChange, types, statuses],
  );
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (node) => node.proTxHash,
    manualPagination: true,
    manualFiltering: true,
  });
  const activeFilters = [
    { key: "ip" as const, value: filters.ip, label: "IP", clear: "" },
    {
      key: "hash" as const,
      value: filters.hash,
      label: "ProTxHash",
      clear: undefined,
    },
    {
      key: "type" as const,
      value: filters.type === "all" ? "" : filters.type,
      label: "Type",
      clear: "all",
    },
    {
      key: "status" as const,
      value: filters.status === "all" ? "" : filters.status,
      label: "Status",
      clear: "all",
    },
  ].filter((filter) => filter.value);

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id={headingId} className="text-xl font-extrabold">
          Masternodes{" "}
          <span className="text-muted-foreground">
            {failed ? "—" : metricNumber(nodes.length, 0)}
          </span>
        </h2>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              aria-label={`Clear ${filter.label} filter`}
              title={filter.value}
              onClick={() =>
                onFiltersChange({ ...filters, [filter.key]: filter.clear })
              }
              className="inline-flex max-w-52 items-center gap-2 rounded-lg bg-action-subtle px-3 py-1 text-xs text-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="truncate">
                {filter.label}: {filter.value}
              </span>
              <X className="size-3 shrink-0" aria-hidden="true" />
            </button>
          ))}
          <fieldset
            aria-label="Loading mode"
            className="inline-flex rounded-xl bg-secondary p-1"
          >
            {(["pagination", "infinite"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setWindow({ key: filterKey, count: limit });
                  if (page !== 1)
                    void navigate({
                      search: { page: 1, limit },
                      resetScroll: false,
                    });
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground aria-pressed:bg-card aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                {value === "pagination" ? "Pages" : "Scroll"}
              </button>
            ))}
          </fieldset>
        </div>
      </div>
      <div className="overflow-x-auto">
        <DataTable
          table={table}
          isFetching={fetching}
          isEmpty={rows.length === 0}
          variant="plain"
          growColumn="proTxHash"
          caption="Masternodes matching the map and column filters"
          skeletonRows={limit}
          skeletonWidths={["w-28", "w-52", "w-20", "w-24", "w-14", "w-24"]}
          emptyMessage={
            failed ? "Masternodes unavailable." : "No matching masternodes."
          }
          className="min-w-[920px] text-sm font-medium leading-5 [&_.dash-data-mono]:text-[13px] [&_th]:bg-secondary [&_th]:py-3 [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl [&_[data-column=posPenaltyScore]]:text-right [&_[data-column=lastPaidTime]]:text-right [&_td]:tabular-nums"
        />
      </div>
      {mode === "infinite" && visibleCount < nodes.length && (
        <LoadMore loading={false} failed={false} onLoad={loadMore} />
      )}
      {mode === "pagination" && !failed && (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          pageSize={limit}
          align="end"
          onPageChange={(next) =>
            void navigate({ search: { page: next, limit }, resetScroll: false })
          }
          onPageSizeChange={(next) =>
            void navigate({
              search: { page: 1, limit: next },
              resetScroll: false,
            })
          }
        />
      )}
    </section>
  );
}
