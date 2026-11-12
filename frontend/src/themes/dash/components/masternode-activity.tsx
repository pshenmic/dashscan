import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { masternodeVotesQueryOptions } from "@/lib/api/masternodes";
import type { ApiMasternode, ApiProposalVote } from "@/lib/api/types";
import { formatDateTime, getMnTypeLabel } from "@/lib/format";
import type { Network } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";
import { CopyButton } from "./copy-button";
import { DataTable } from "./data-table";
import { Pagination } from "./pagination";

const columns: ColumnDef<ApiProposalVote>[] = [
  {
    id: "proposal",
    header: "Proposal",
    cell: ({ row }) =>
      row.original.proposalHash ? (
        <div className="flex w-0 min-w-full items-center gap-2">
          <Link
            to="/dao/$hash"
            params={{ hash: row.original.proposalHash }}
            title={row.original.proposalHash}
            className="dash-data-mono min-w-0 flex-1 truncate hover:text-accent"
          >
            {row.original.proposalHash}
          </Link>
          <CopyButton value={row.original.proposalHash} />
        </div>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "outcome",
    header: "Vote",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.outcome === "yes"
            ? "border-success/20 bg-positive-brand/12 text-success"
            : row.original.outcome === "no"
              ? "border-destructive/20 bg-destructive/12 text-destructive"
              : "border-border text-muted-foreground"
        }
      >
        {row.original.outcome}
      </Badge>
    ),
  },
  {
    accessorKey: "signal",
    header: "Signal",
    cell: ({ row }) => (
      <span className="capitalize">{row.original.signal}</span>
    ),
  },
  {
    accessorKey: "time",
    header: "Timestamp",
    cell: ({ row }) => <BlockAge timestamp={row.original.time} />,
  },
];

export function MasternodeVotes({
  network,
  hash,
}: {
  network: Network;
  hash: string;
}) {
  const query = useQuery({
    ...masternodeVotesQueryOptions({ network, hash }),
    retry: 1,
  });
  const [page, setPage] = useState(1);
  const sorted = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (first, second) => Date.parse(second.time) - Date.parse(first.time),
      ),
    [query.data],
  );
  const pageCount = Math.ceil(sorted.length / 5);
  const currentPage = Math.min(page, Math.max(1, pageCount));
  const rows = useMemo(
    () => sorted.slice((currentPage - 1) * 5, currentPage * 5),
    [sorted, currentPage],
  );
  const table = useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });
  if (query.data == null) return null;
  return (
    <section
      aria-label="DAO votes"
      className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
    >
      <h2 className="mb-4 text-xl font-extrabold">DAO votes</h2>
      {query.isError && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Could not load votes.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </p>
      )}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No DAO votes returned.</p>
      ) : (
        <div className="overflow-x-auto">
          <DataTable
            table={table}
            variant="plain"
            growColumn="proposal"
            caption="DAO votes reported for this masternode"
            isFetching={query.isFetching}
            isEmpty={rows.length === 0}
            skeletonRows={5}
            skeletonWidths={["w-40", "w-12", "w-16", "w-16"]}
            emptyMessage={
              query.isError ? "Votes unavailable" : "No votes returned."
            }
            className="min-w-[440px]"
          />
        </div>
      )}
      {pageCount > 1 && (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          align="end"
        />
      )}
    </section>
  );
}

export function MasternodeActivity({
  network,
  node,
}: {
  network: Network;
  node: ApiMasternode;
}) {
  const titleId = useId();
  const platformExplorer =
    network === "testnet"
      ? "https://testnet.platform-explorer.com"
      : "https://platform-explorer.com";
  const lastPaidTime =
    node.lastPaidTime && Date.parse(node.lastPaidTime) > 0
      ? node.lastPaidTime
      : null;
  return (
    <div className="min-w-0 rounded-3xl bg-card p-4 sm:p-6">
      <section aria-labelledby={titleId} className="pb-5">
        <h2 id={titleId} className="text-xl font-extrabold">
          Core payments
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <dt className="text-xs text-muted-foreground">Last paid block</dt>
            <dd className="text-xl font-medium tabular-nums">
              {node.lastPaidBlock > 0 ? (
                <Link
                  to="/blocks/$hashOrHeight"
                  params={{ hashOrHeight: String(node.lastPaidBlock) }}
                  className="text-accent hover:underline"
                >
                  #{metricNumber(node.lastPaidBlock, 0)}
                </Link>
              ) : node.lastPaidBlock === 0 ? (
                "Never"
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="space-y-2">
            <dt className="text-xs text-muted-foreground">Last payment</dt>
            <dd className="text-sm tabular-nums">
              {node.lastPaidBlock > 0 && lastPaidTime ? (
                <time dateTime={lastPaidTime}>
                  {formatDateTime(lastPaidTime)}
                </time>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </section>
      {getMnTypeLabel(node.type) === "Evonode" && (
        <section
          aria-label="Platform activity"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-5"
        >
          <h2 className="text-xl font-extrabold">Platform</h2>
          <a
            href={`${platformExplorer}/validator/${node.proTxHash.toLowerCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline"
          >
            View validator<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </section>
      )}
    </div>
  );
}
