import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { useClockValue } from "@/components/render-clock";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { proposalsQueryOptions } from "@/lib/api/governance";
import type { ApiGovernanceObject } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { proposalsAnchor } from "@/lib/governance";
import { appStore } from "@/lib/store";
import { GovernanceTable } from "@/themes/dash/components/governance-table";

const number = (value: number | null) =>
  value == null ? "—" : formatNumber(value, { maximumFractionDigits: 8 });
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

export type PaymentPeriod = ReturnType<typeof paymentPeriod>;
type ListedProposal = ApiGovernanceObject & {
  period: PaymentPeriod;
};
function SortHeader({
  column,
  label,
  hint,
}: {
  column: Column<ListedProposal>;
  label: string;
  hint?: string;
}) {
  const order = column.getIsSorted();
  return (
    <DropdownMenu>
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
        {hint && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="whitespace-normal text-xs font-normal text-muted-foreground">
              {hint}
            </DropdownMenuLabel>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function proposalColumns(
  threshold: number | null | undefined,
): ColumnDef<ListedProposal>[] {
  const voteColumns: ColumnDef<ListedProposal>[] = (
    [
      ["absoluteYesCount", "Net yes", "font-semibold text-foreground"],
      ["yesCount", "Yes", "text-success"],
      ["noCount", "No", "text-destructive"],
      ["abstainCount", "Abstain", "text-muted-foreground"],
    ] as const
  ).map(([key, label, color]) => ({
    id: key,
    accessorFn: (row) => row[key] ?? undefined,
    sortingFn: "basic",
    sortUndefined: "last",
    sortDescFirst: true,
    header: ({ column }) => (
      <SortHeader
        column={column}
        label={label}
        hint={
          key === "absoluteYesCount"
            ? `Weighted yes votes minus no votes. Estimated vote threshold: ${threshold == null ? "—" : formatNumber(threshold)}.`
            : undefined
        }
      />
    ),
    cell: ({ row }) => (
      <span className={`block text-right ${color}`}>
        {number(row.original[key])}
      </span>
    ),
  }));
  return [
    {
      id: "name",
      accessorFn: (row) => row.name || row.hash || undefined,
      sortingFn: "text",
      sortUndefined: "last",
      sortDescFirst: false,
      header: ({ column }) => <SortHeader column={column} label="Proposal" />,
      cell: ({ row: { original } }) => (
        <div>
          {original.hash ? (
            <Link
              to="/dao/$hash"
              params={{ hash: original.hash }}
              className="break-words font-semibold text-accent hover:underline"
            >
              {original.name || original.hash}
            </Link>
          ) : (
            original.name || "—"
          )}
          <p className="text-xs font-normal text-muted-foreground">
            Payment period: {original.period}
          </p>
        </div>
      ),
    },
    {
      id: "paymentAmount",
      accessorFn: (row) => row.paymentAmount ?? undefined,
      sortingFn: "basic",
      sortUndefined: "last",
      sortDescFirst: true,
      header: ({ column }) => (
        <SortHeader column={column} label="Requested / cycle (DASH)" />
      ),
      cell: ({ row }) => number(row.original.paymentAmount),
    },
    ...voteColumns,
  ];
}
export function useListedProposals() {
  const minute = useClockValue((now) => Math.floor(now / 60_000));
  const network = useStore(appStore, (state) => state.network);
  const query = useQuery(
    proposalsQueryOptions({ network, proposalType: "all" }),
  );
  const rows = useMemo(
    () =>
      (query.data ?? [])
        .filter((row) => row.objectType === "Proposal")
        .map<ListedProposal>((row) => ({
          ...row,
          period: paymentPeriod(row, minute * 60),
        }))
        .sort((first, second) =>
          (second.creationTime ?? "").localeCompare(first.creationTime ?? ""),
        ),
    [query.data, minute],
  );
  return { query, rows, network };
}

export function ProposalBadges({
  rows,
  selected,
  onChange,
}: {
  rows: ListedProposal[];
  selected: PaymentPeriod | null;
  onChange: (value: PaymentPeriod | null) => void;
}) {
  const periods = useMemo(() => {
    const counts = { Active: 0, Upcoming: 0, Ended: 0, Unknown: 0 };
    for (const row of rows) counts[row.period]++;
    return counts;
  }, [rows]);
  return (
    <ul
      aria-label="Payment periods of listed proposals"
      className="flex flex-wrap gap-2"
    >
      {(Object.keys(periods) as PaymentPeriod[])
        .filter((label) => periods[label] > 0 || label === selected)
        .map((label) => (
          <li key={label}>
            <button
              type="button"
              aria-pressed={selected === label}
              onClick={() => onChange(selected === label ? null : label)}
              title={`${label} payment period · listed proposals only`}
              className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-foreground hover:border-accent aria-pressed:border-accent aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              {label}{" "}
              <strong className="tabular-nums">
                {formatNumber(periods[label])}
              </strong>
            </button>
          </li>
        ))}
    </ul>
  );
}

export function ProposalsSection({
  query,
  rows,
  network,
  search,
  period,
  threshold,
}: ReturnType<typeof useListedProposals> & {
  search: string;
  period: PaymentPeriod | null;
  threshold: number | null | undefined;
}) {
  const columns = useMemo(() => proposalColumns(threshold), [threshold]);
  const visibleRows = useMemo(
    () => (period ? rows.filter((row) => row.period === period) : rows),
    [period, rows],
  );
  return (
    <section
      id={proposalsAnchor}
      aria-label="Listed proposals"
      className="scroll-mt-24"
    >
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
          filterKey={period}
          storageKey="dao-proposals"
          externalSearch={search}
          caption="Governance proposals and funding votes"
          growColumn="name"
          rows={visibleRows}
          columns={columns}
          searchLabel="Name, hash or address"
          searchText={searchText}
          busy={query.isPending}
          emptyMessage={
            period
              ? "No proposals for this payment period."
              : "No proposals reported."
          }
        />
      )}
    </section>
  );
}
