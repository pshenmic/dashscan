import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import type { ApiTransaction } from "@/lib/api/types";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionAmount } from "@/themes/dash/lib/transaction-detail";
import { AddressLink } from "./address-link";
import { CopyButton } from "./copy-button";
import styles from "./transaction-inputs-outputs.module.css";
import { TransactionAmount } from "./transaction-value-distribution";

type IoEntry = {
  index: number;
  address: string | null;
  amount: number | null;
  previousHash?: string | null;
  previousIndex?: number | null;
  label: string;
};

const pageSize = 10;

function IoColumn({
  title,
  entries,
  output = false,
}: {
  title: string;
  entries: IoEntry[];
  output?: boolean;
}) {
  const [page, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(entries.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  return (
    <section aria-label={title} className="min-w-0 space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ol
        start={currentPage * pageSize + 1}
        className={`${styles.column} ${output ? styles.outputs : styles.inputs}`}
      >
        {entries
          .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
          .map((entry) => (
            <li
              key={entry.index}
              className={`${styles.entry} group flex min-w-0 flex-wrap items-center gap-3 rounded-3xl bg-card p-3`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${output ? "bg-positive-brand/12 text-success" : "bg-action-subtle text-accent"}`}
              >
                {entry.index}
              </span>
              <div className="min-w-0 flex-1 basis-32 space-y-1">
                <div className="flex min-w-0 items-center gap-1">
                  {entry.address ? (
                    <>
                      <AddressLink
                        address={entry.address}
                        className="block min-w-0 flex-1 truncate font-mono text-xs text-accent hover:underline"
                      />
                      <CopyButton value={entry.address} />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {entry.label}
                    </span>
                  )}
                </div>
                {entry.previousHash && (
                  <Link
                    to="/transactions/$hash"
                    params={{ hash: entry.previousHash }}
                    title={`${entry.previousHash}:${entry.previousIndex ?? "?"}`}
                    className="flex min-w-0 font-mono text-xs text-muted-foreground hover:text-accent"
                  >
                    <span className="truncate">{entry.previousHash}</span>
                    <span className="shrink-0">
                      :{entry.previousIndex ?? "?"}
                    </span>
                  </Link>
                )}
              </div>
              <span className="ml-auto text-right text-xs">
                <TransactionAmount value={entry.amount} />
              </span>
            </li>
          ))}
        {!entries.length && (
          <li className="rounded-3xl bg-secondary p-4 text-sm text-muted-foreground">
            No {title.toLowerCase()}.
          </li>
        )}
      </ol>
      {lastPage > 0 && (
        <nav
          aria-label={`${title} pages`}
          className="flex items-center justify-end gap-3 text-xs"
        >
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            className="rounded-lg border border-border bg-card px-3 py-2 hover:bg-action-subtle disabled:opacity-40"
          >
            Previous
          </button>
          <span className="tabular-nums">
            {metricNumber(currentPage + 1, 0)} / {metricNumber(lastPage + 1, 0)}
          </span>
          <button
            type="button"
            disabled={currentPage === lastPage}
            onClick={() => setPage(currentPage + 1)}
            className="rounded-lg border border-border bg-card px-3 py-2 hover:bg-action-subtle disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

export function TransactionInputsOutputs({
  transaction,
  coinbase,
}: {
  transaction: ApiTransaction;
  coinbase: boolean;
}) {
  const titleId = useId();
  const inputs = (transaction.vIn ?? []).map(
    (input, index): IoEntry => ({
      index,
      address: input.address,
      amount: transactionAmount(input.amount),
      previousHash: input.prevTxHash,
      previousIndex: input.vOutIndex,
      label: coinbase ? "Coinbase" : "No address",
    }),
  );
  const outputs = (transaction.vOut ?? []).map(
    (output): IoEntry => ({
      index: output.number,
      address: output.address,
      amount: transactionAmount(output.value),
      label: output.scriptPubKeyASM?.startsWith("OP_RETURN")
        ? "OP_RETURN"
        : "Script output",
    }),
  );
  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={titleId} className="text-xl font-extrabold">
          Inputs &amp; Outputs
        </h2>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
          Inputs:{" "}
          <strong className="text-foreground">
            {metricNumber(inputs.length, 0)}
          </strong>
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
          Outputs:{" "}
          <strong className="text-foreground">
            {metricNumber(outputs.length, 0)}
          </strong>
        </span>
      </div>
      <div
        className={`${styles.diagram} mt-6 grid min-h-64 items-center gap-6 rounded-2xl px-2 py-6 sm:px-4 lg:grid-cols-2 lg:gap-24`}
      >
        <IoColumn
          key={`${transaction.hash}:inputs`}
          title="Inputs"
          entries={inputs}
        />
        <IoColumn
          key={`${transaction.hash}:outputs`}
          title="Outputs"
          entries={outputs}
          output
        />
      </div>
    </section>
  );
}
