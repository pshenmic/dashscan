import type { ColumnDef } from "@tanstack/react-table";
import { LockKeyhole } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApiTransaction } from "@/lib/api/types";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";
import { BlockAge } from "./block-age";
import { IdentifierLink } from "./identifier-link";
import { LatestRecordsTable } from "./latest-records-table";
import { TransactionTypeBadge } from "./transaction-type-badge";

function ColumnLabel({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{description}</TooltipContent>
    </Tooltip>
  );
}

const columns: ColumnDef<ApiTransaction>[] = [
  {
    accessorKey: "hash",
    header: "Transaction Hash",
    cell: ({ row: { original: transaction } }) => (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <IdentifierLink
            kind="transaction"
            value={transaction.hash}
            prefix={
              <img
                src="/icons/home/transaction.svg"
                alt=""
                width={24}
                height={24}
                className="size-6 shrink-0"
              />
            }
          />
        </div>
        <span className="flex size-6 shrink-0 items-center justify-center">
          {transaction.instantLock && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="InstantSend locked"
                  className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <LockKeyhole className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                InstantSend locked: a masternode quorum has locked this
                transaction's inputs to prevent double-spending. This is
                separate from block confirmations.
              </TooltipContent>
            </Tooltip>
          )}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <TransactionTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "amount",
    header: () => (
      <ColumnLabel
        label="Output total"
        description="Sum of all outputs, including change, in DASH."
      />
    ),
    cell: ({ row }) => transactionAmount(row.original.amount),
  },
  {
    accessorKey: "timestamp",
    header: () => (
      <ColumnLabel
        label="Timestamp"
        description="Time since the containing block's timestamp. Transactions in the same block share this time."
      />
    ),
    cell: ({ row }) =>
      row.original.timestamp ? (
        <BlockAge
          timestamp={row.original.timestamp}
          blockHeight={row.original.blockHeight}
        />
      ) : (
        "—"
      ),
  },
];

export function LatestTransactionsTable({
  rows,
  busy,
  error,
  onRetry,
}: {
  rows: ApiTransaction[];
  busy: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="min-w-0 rounded-3xl dash-home-panel p-4 sm:p-6">
      <h3 className="text-2xl font-medium leading-[1.1]">Transaction List</h3>
      <p className="mt-2 text-sm font-medium leading-[1.1] text-muted-foreground">
        Latest indexed transactions · updates every 30 seconds
      </p>
      {error && (
        <p role="alert" className="dash-body-compact mt-4 text-destructive">
          Could not load transactions.{" "}
          {rows.length > 0 && "Showing the last available data. "}
          <button
            type="button"
            className="underline"
            onClick={() => void onRetry()}
          >
            Try again
          </button>
        </p>
      )}
      <div className="mt-6">
        <LatestRecordsTable
          rows={rows}
          columns={columns}
          busy={busy}
          growColumn="hash"
          caption="Latest mined transactions, newest blocks first. Timestamp refers to the containing block. Output total includes all outputs, including change."
          emptyMessage={
            error ? "Transaction data unavailable" : "No transactions found."
          }
          className="[&_th:first-child]:pl-11 [&_[data-column=amount]]:text-right [&_[data-column=timestamp]]:text-right"
        />
      </div>
    </div>
  );
}
