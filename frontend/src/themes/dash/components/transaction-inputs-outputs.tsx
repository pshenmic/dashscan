import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import type { ApiTransaction } from "@/lib/api/types";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { transactionAmount } from "@/themes/dash/lib/transaction-detail";
import { IdentifierLink } from "./identifier-link";

type IoEntry = {
  index: number;
  address: string | null;
  amount: number | null;
  linkedHash?: string | null;
  linkedIndex?: number | null;
  label: string;
};

function IoColumn({
  title,
  entries,
  output = false,
}: {
  title: string;
  entries: IoEntry[];
  output?: boolean;
}) {
  const fragment = useLocation({ select: (location) => location.hash });
  const targetRow = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (fragment && output)
      targetRow.current?.scrollIntoView({ block: "center" });
  }, [fragment, output]);
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-3xl bg-card p-4 sm:p-6"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-medium leading-5">
          <caption className="sr-only">{title}</caption>
          <thead className="text-left text-muted-foreground">
            <tr>
              <th
                scope="col"
                className="w-px rounded-l-xl bg-secondary px-2 py-3"
              >
                <span aria-hidden="true">#</span>
                <span className="sr-only">Index</span>
              </th>
              <th scope="col" className="bg-secondary px-2 py-3">
                <span className="whitespace-nowrap text-foreground">
                  {title}{" "}
                  <span className="text-muted-foreground tabular-nums">
                    {metricNumber(entries.length, 0)}
                  </span>
                </span>
              </th>
              <th
                scope="col"
                className="w-px whitespace-nowrap rounded-r-xl bg-secondary px-2 py-3 text-right"
              >
                Amount (DASH)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <tr
                key={entry.index}
                id={output ? `output-${entry.index}` : undefined}
                ref={
                  output && fragment === `output-${entry.index}`
                    ? targetRow
                    : undefined
                }
                data-highlighted={
                  (output && fragment === `output-${entry.index}`) || undefined
                }
                className="group data-[highlighted]:bg-action-subtle"
              >
                <td className="px-2 py-2.5 text-muted-foreground tabular-nums">
                  {entry.index}
                </td>
                <td className="px-2 py-2.5 [&_.dash-data-mono]:text-[13px] [&_a.dash-data-mono]:text-accent">
                  {entry.address ? (
                    <IdentifierLink kind="address" value={entry.address} />
                  ) : (
                    <span className="block">
                      {entry.label === "OP_RETURN"
                        ? "Unspendable output"
                        : entry.label}
                    </span>
                  )}
                  {entry.linkedHash ? (
                    <Link
                      to="/transactions/$hash"
                      params={{ hash: entry.linkedHash }}
                      hash={
                        !output && entry.linkedIndex != null
                          ? `output-${entry.linkedIndex}`
                          : undefined
                      }
                      title={entry.linkedHash}
                      className="mt-1 inline-block text-xs text-muted-foreground underline decoration-border underline-offset-2 hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {output
                        ? "Spending transaction"
                        : entry.linkedIndex != null
                          ? `Previous output #${entry.linkedIndex}`
                          : "Previous transaction"}
                    </Link>
                  ) : output ? (
                    <span className="mt-1 inline-block text-xs text-muted-foreground">
                      {entry.label === "OP_RETURN"
                        ? "OP_RETURN"
                        : "No recorded spend"}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">
                  {metricDuffs(entry.amount)}
                </td>
              </tr>
            ))}
            {!entries.length && (
              <tr>
                <td
                  colSpan={3}
                  className="py-4 text-center text-muted-foreground"
                >
                  No {title.toLowerCase()}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
  const inputs = (transaction.vIn ?? []).map(
    (input, index): IoEntry => ({
      index,
      address: input.address,
      amount: transactionAmount(input.amount),
      linkedHash: input.prevTxHash,
      linkedIndex: input.vOutIndex,
      label: coinbase ? "Coinbase" : "No address",
    }),
  );
  const outputs = (transaction.vOut ?? []).map(
    (output): IoEntry => ({
      index: output.number,
      address: output.address,
      amount: transactionAmount(output.value),
      linkedHash: output.spentTxId,
      label: output.scriptPubKeyASM?.startsWith("OP_RETURN")
        ? "OP_RETURN"
        : "Script output",
    }),
  );
  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">
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
  );
}
