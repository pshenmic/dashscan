import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Filter } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useClockValue } from "@/components/render-clock";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { proposalsQueryOptions } from "@/lib/api/governance";
import type { ApiGovernanceObject } from "@/lib/api/types";
import { formatDateTime, formatNumber } from "@/lib/format";
import { proposalsAnchor } from "@/lib/governance";
import { appStore } from "@/lib/store";
import { GovernanceTable } from "@/themes/dash/components/governance-table";

const number = (value: number | null) =>
  value == null ? "—" : formatNumber(value, { maximumFractionDigits: 8 });
const calendarDate = (value: string | number) =>
  formatDateTime(value, { year: "numeric", month: "short", day: "numeric" });
const searchText = (row: ApiGovernanceObject) =>
  [row.name, row.hash, row.paymentAddress].join(" ");
function paymentPeriod(
  { startEpoch, endEpoch }: ApiGovernanceObject,
  now: number,
) {
  if (startEpoch == null || endEpoch == null || endEpoch <= startEpoch)
    return "Unknown";
  if (now < startEpoch) return "Upcoming";
  return now < endEpoch ? "Active" : "Ended";
}

type ListedProposal = ApiGovernanceObject & {
  period: ReturnType<typeof paymentPeriod>;
};
const headerLayout =
  "inline-grid grid-rows-[1.5rem_1rem] items-center justify-items-center gap-x-1 gap-y-0.5 whitespace-nowrap align-middle text-sm font-semibold text-foreground";
const headerSummary =
  "col-start-1 row-start-2 text-xs leading-4 font-normal tabular-nums text-muted-foreground";
function periodBadge(period: string) {
  return `inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${period === "Active" ? "bg-positive-brand/12 text-success" : period === "Upcoming" ? "bg-action-subtle text-accent" : "bg-secondary text-muted-foreground"}`;
}
function SortHeader({
  column,
  label,
  summary,
}: {
  column: Column<ListedProposal>;
  label: string;
  summary: ReactNode;
}) {
  const order = column.getIsSorted();
  return (
    <span className={headerLayout}><DropdownMenu>
      <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
        {label}
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Sort by ${label}`}
            className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-action-subtle hover:text-accent data-[state=open]:bg-action-subtle focus-visible:outline-2 focus-visible:outline-ring ${order ? "bg-action-subtle text-accent" : "text-muted-foreground"}`}
          >
            <ChevronDown className="size-3" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
      </span>
      <span className={headerSummary}>{summary ?? "—"}</span>
      <DropdownMenuContent
        align={column.id === "name" ? "start" : "end"}
        className="w-52"
      >
        <DropdownMenuRadioGroup
          value={order || "default"}
          onValueChange={(value) =>
            value === "default"
              ? column.clearSorting()
              : column.toggleSorting(value === "desc")
          }
        >
          <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="default">
            Newest first (default)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

      </DropdownMenuContent>
    </DropdownMenu></span>
  );
}
function proposalColumns(
  threshold: number | null | undefined,
  rows: ListedProposal[] | undefined,
  totalCount: number,
  totalRequested: number | null | undefined,
  periodHeader: ReactNode,
): ColumnDef<ListedProposal>[] {
  const voteColumns: ColumnDef<ListedProposal>[] = (
    [
      ["absoluteYesCount", "Net yes", "font-semibold text-foreground"],
      [
        "yesCount",
        "Yes",
        "inline-flex rounded-full border border-action-subtle bg-action-subtle px-2 py-1 text-xs font-semibold",
      ],
      [
        "noCount",
        "No",
        "inline-flex rounded-full border border-border bg-foreground/12 px-2 py-1 text-xs font-semibold",
      ],
      [
        "abstainCount",
        "Abstain",
        "inline-flex rounded-full border border-border bg-secondary px-2 py-1 text-xs font-semibold text-muted-foreground",
      ],
    ] as const
  ).map(([key, label, color]) => ({
    id: key,
    accessorFn: (row) => row[key] ?? undefined,
    sortingFn: "basic",
    sortUndefined: "last",
    sortDescFirst: true,
    header: ({ column }) =>
      key === "absoluteYesCount" ? (
        <SortHeader
          column={column}
          label={label}
          summary={
            threshold == null ? null : `Threshold: ${formatNumber(threshold)}`
          }
        />
      ) : (
        <SortHeader
          column={column}
          label={label}
          summary={null}
        />
      ),
    cell: ({ row }) => {
      const value = row.original[key];
      if (key === "absoluteYesCount" && value != null) {
        const meetsThreshold =
          row.original.enoughVotes ??
          (threshold == null ? null : value >= threshold);
        const status =
          meetsThreshold == null
            ? "Vote threshold unknown"
            : meetsThreshold
              ? "Vote threshold met"
              : "Below vote threshold";
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold tabular-nums ${meetsThreshold ? "bg-positive-brand/12 text-success" : "bg-secondary text-muted-foreground"}`}
            title={status}
          >
            {number(value)}
            <span className="sr-only"> · {status}</span>
          </span>
        );
      }
      return value == null ? (
        "—"
      ) : (
        <span className={color}>{number(value)}</span>
      );
    },
  }));
  return [
    {
      accessorKey: "period",
      header: () => periodHeader,
      cell: ({
        row: {
          original: { period, startEpoch, endEpoch },
        },
      }) => {
        const boundary = period === "Upcoming" ? startEpoch : endEpoch;
        const dateLabel =
          period === "Upcoming"
            ? "Upcoming · Starts"
            : period === "Active"
              ? "Active · Ends"
              : "Ended";
        return (
          <span
            title={period === "Unknown" ? undefined : dateLabel}
            className={periodBadge(period)}
          >
            {period === "Unknown" || boundary == null ? (
              "Unknown"
            ) : (
              <>
                <span className="sr-only">{dateLabel}: </span>
                {calendarDate(boundary * 1000)}
              </>
            )}
          </span>
        );
      },
    },
    {
      id: "name",
      header: () => (
        <span className={headerLayout}>
          <span>Proposal</span>
          <span className={headerSummary}>
            {rows == null
              ? "—"
              : rows.length === totalCount
                ? `Total: ${formatNumber(totalCount)}`
                : `${formatNumber(rows.length)} of ${formatNumber(totalCount)}`}
          </span>
        </span>
      ),
      cell: ({ row: { original } }) =>
        original.hash ? (
          <Link
            to="/dao/$hash"
            params={{ hash: original.hash }}
            className="break-words font-semibold text-accent hover:underline"
          >
            {original.name || original.hash}
          </Link>
        ) : (
          original.name || "—"
        ),
    },
    {
      id: "paymentAmount",
      accessorFn: (row) => row.paymentAmount ?? undefined,
      sortingFn: "basic",
      sortUndefined: "last",
      sortDescFirst: true,
      header: ({ column }) => (
        <SortHeader
          column={column}
          label="Requested"
          summary={
            totalRequested == null ? "—" : `${number(totalRequested)} DASH`
          }
        />
      ),
      cell: ({ row }) =>
        row.original.paymentAmount == null
          ? "—"
          : `${number(row.original.paymentAmount)} DASH`,
    },
    ...voteColumns,
    {
      id: "creationTime",
      accessorFn: (row) => {
        const timestamp = Date.parse(row.creationTime ?? "");
        return Number.isFinite(timestamp) ? timestamp : undefined;
      },
      sortingFn: "basic",
      sortDescFirst: true,
      sortUndefined: "last",
      header: ({ column }) => (
        <SortHeader column={column} label="Created" summary="UTC" />
      ),
      cell: ({ row }) =>
        row.original.creationTime ? (
          <time
            dateTime={row.original.creationTime}
            className="whitespace-nowrap"
          >
            {calendarDate(row.original.creationTime)}
          </time>
        ) : (
          "—"
        ),
    },
  ];
}
export function useListedProposals() {
  const minute = useClockValue((now) => Math.floor(now / 60_000));
  const network = useStore(appStore, (state) => state.network);
  const query = useQuery({
    ...proposalsQueryOptions({ network, proposalType: "all" }),
    refetchInterval: 30_000,
  });
  const rows = useMemo(
    () =>
      (query.data ?? [])
        .filter((row) => row.objectType === "Proposal")
        .map<ListedProposal>((row) => ({
          ...row,
          period: paymentPeriod(row, minute * 60),
        })),
    [query.data, minute],
  );
  return { query, rows, network };
}

export function ProposalsSection({
  heading,
  query,
  rows,
  network,
  search,
  threshold,
  totalRequested,
}: ReturnType<typeof useListedProposals> & {
  heading: ReactNode;
  search: string;
  threshold: number | null | undefined;
  totalRequested: number | null | undefined;
}) {
  const [period, setPeriod] = useState("all");
  const periods = useMemo(() => {
    const counts = { Active: 0, Upcoming: 0, Ended: 0, Unknown: 0 };
    for (const row of rows) counts[row.period]++;
    return Object.entries(counts).filter(([, count]) => count > 0);
  }, [rows]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (period === "all" || row.period === period) &&
        (!term || searchText(row).toLowerCase().includes(term)),
    );
  }, [period, rows, search]);
  const listedRows = query.data ? filtered : undefined;
  const columns = useMemo(
    () =>
      proposalColumns(
        threshold,
        listedRows,
        rows.length,
        totalRequested,
        <DropdownMenu>
          <span className={`${headerLayout} grid-cols-[auto_auto]`}>
            <span>Payment period</span>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={
                  period === "all"
                    ? "Filter by payment period"
                    : `Filter by payment period: ${period}`
                }
                className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-action-subtle hover:text-accent focus-visible:outline-2 focus-visible:outline-ring ${period === "all" ? "text-muted-foreground" : "bg-action-subtle text-accent"}`}
              >
                <Filter aria-hidden="true" className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <span className={headerSummary}>
              {periods.length
                ? periods
                    .map(
                      ([name, count]) =>
                        `${formatNumber(count)} ${name.toLowerCase()}`,
                    )
                    .join(" · ")
                : "—"}
            </span>
          </span>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup value={period} onValueChange={setPeriod}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              {periods.map(([value, count]) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <span className={periodBadge(value)}>{value}</span>
                  <span className="ms-auto text-xs tabular-nums text-muted-foreground">
                    {formatNumber(count)}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      ),
    [period, periods, threshold, listedRows, rows.length, totalRequested],
  );
  return (
    <section
      id={proposalsAnchor}
      aria-label="Listed proposals"
      className="min-w-0 scroll-mt-24 rounded-3xl bg-card p-4 sm:p-6 [&_thead_th]:py-2"
    >
      {query.isError && !query.data && heading}
      {query.isError && (
        <p role="alert">
          Could not load proposals.{" "}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </p>
      )}
      {(!query.isError || query.data) && (
        <GovernanceTable
          key={network}
          initialSorting={[{ id: "absoluteYesCount", desc: true }]}
          storageKey="dao-proposals"
          filterKey={period}
          controls={heading}
          externalSearch={search}
          caption="Governance proposals and funding votes"
          growColumn="name"
          rows={filtered}
          columns={columns}
          searchLabel="Name, hash or address"
          searchText={searchText}
          busy={query.isPending}
          emptyMessage={
            search.trim()
              ? "No matching results."
              : period === "all"
                ? "No proposals reported."
                : "No proposals for this payment period."
          }
        />
      )}
    </section>
  );
}
