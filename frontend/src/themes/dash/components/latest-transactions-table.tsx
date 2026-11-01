import { LockKeyhole } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApiTransaction } from "@/lib/api/types";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";
import { BlockAge } from "./block-age";
import { HomeTable } from "./home-table";
import { IdentifierLink } from "./identifier-link";
import { TransactionTypeBadge } from "./transaction-type-badge";
export function LatestTransactionsTable({
  rows,
  loading,
  error,
  onRetry,
}: {
  rows: ApiTransaction[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="min-w-0 rounded-3xl bg-foreground/3 p-4 sm:p-6">
      <h3 className="text-2xl font-medium leading-[1.1]">Transaction List</h3>
      <p className="mt-2 text-sm font-medium leading-[1.1] text-foreground/48">
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
      <div className="mt-6 overflow-x-auto">
        <HomeTable className="min-w-[700px] font-medium">
          <caption className="sr-only">
            Latest mined transactions, newest blocks first. Age is the age of
            the containing block. Output total includes all outputs, including
            change.
          </caption>
          <thead className="text-foreground/48">
            <tr>
              {["Transaction Hash", "Type", "Output total", "Block age"].map(
                (label) => (
                  <th
                    key={label}
                    scope="col"
                    className="border-b border-foreground/8 px-3 pb-3 pt-2 font-medium first:pl-11 [&:nth-child(n+3)]:text-right"
                  >
                    {label === "Output total" || label === "Block age" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            {label}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">
                          {label === "Output total"
                            ? "Sum of all outputs, including change, in DASH."
                            : "Time since the containing block's timestamp. Transactions in the same block share this time."}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      label
                    )}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction) => (
              <tr
                key={transaction.hash}
                className="border-b border-foreground/8 last:border-0"
              >
                <td data-grow className="px-3 py-[18px]">
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
                              className="inline-flex size-6 items-center justify-center rounded-full text-foreground/64 focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <LockKeyhole
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-64">
                            InstantSend locked: a masternode quorum has locked
                            this transaction's inputs to prevent
                            double-spending. This is separate from block
                            confirmations.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-[18px]">
                  <TransactionTypeBadge type={transaction.type} />
                </td>
                <td className="whitespace-nowrap px-3 py-[18px] text-right tabular-nums text-brand">
                  {transactionAmount(transaction.amount)}
                </td>
                <td className="whitespace-nowrap px-3 py-[18px] text-right tabular-nums">
                  {transaction.timestamp ? (
                    <BlockAge
                      timestamp={transaction.timestamp}
                      blockHeight={transaction.blockHeight}
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-muted-foreground"
                >
                  {loading
                    ? "Loading transactions…"
                    : error
                      ? "Transaction data unavailable"
                      : "No transactions found."}
                </td>
              </tr>
            )}
          </tbody>
        </HomeTable>
      </div>
    </div>
  );
}
