import { Tooltip as ChartTooltip, Pie, PieChart } from "recharts";
import type { ApiTransaction } from "@/lib/api/types";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import {
  type TransactionTotals,
  transactionAmount,
} from "@/themes/dash/lib/transaction-detail";
import { AddressLink } from "./address-link";
import { MissingApiData } from "./missing-api-data";

const colors = [
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--chart-3)",
];

export function TransactionAmount({ value }: { value: number | null }) {
  return value === null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span className="tabular-nums">
      {metricDuffs(value)}{" "}
      <span className="text-xs font-medium text-muted-foreground">DASH</span>
    </span>
  );
}

export function TransactionValueDistribution({
  transaction,
  totals,
}: {
  transaction: ApiTransaction;
  totals: TransactionTotals;
}) {
  if (!totals.monetary) {
    return (
      <section
        aria-label="Value distribution"
        className="flex min-w-0 flex-col items-center justify-center gap-3 rounded-3xl bg-card p-6 text-center"
      >
        <h2 className="text-xl font-extrabold">Protocol transaction</h2>
        <p className="text-sm text-muted-foreground">
          No monetary inputs or outputs.
        </p>
      </section>
    );
  }
  const grouped = new Map<
    string,
    { label: string; address: string | null; value: number }
  >();
  for (const output of transaction.vOut ?? []) {
    const value = transactionAmount(output.value);
    if (value === null || value === 0) continue;
    const key = output.address || `output:${output.number}`;
    const previous = grouped.get(key);
    grouped.set(key, {
      label: output.address || `Output #${output.number}`,
      address: output.address,
      value: (previous?.value ?? 0) + value,
    });
  }
  const outputs = [...grouped.values()].sort(
    (first, second) => second.value - first.value,
  );
  const slices = outputs.slice(0, 3);
  if (outputs.length > 3)
    slices.push({
      label: "Other outputs",
      address: null,
      value: outputs.slice(3).reduce((sum, item) => sum + item.value, 0),
    });
  const data = slices.map((slice, index) => ({
    ...slice,
    fill: colors[index],
  }));
  if (totals.fee !== null && totals.fee > 0)
    data.push({
      label: "Fee",
      address: null,
      value: totals.fee,
      fill: "var(--chart-3)",
    });
  const total =
    totals.output === null ? null : totals.output + (totals.fee ?? 0);
  return (
    <section
      aria-label="Value distribution"
      className="flex min-w-0 flex-col justify-center gap-8 rounded-3xl bg-card p-4 sm:p-6"
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
        <div className="relative size-44 shrink-0" aria-hidden="true">
          {total !== null && total > 0 ? (
            <PieChart width={176} height={176} accessibilityLayer={false}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={68}
                outerRadius={86}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                cornerRadius={4}
                paddingAngle={0}
                isAnimationActive={false}
                rootTabIndex={-1}
              />
              <ChartTooltip
                allowEscapeViewBox={{ x: true, y: true }}
                content={({ active, payload }) => {
                  const slice = payload?.[0]?.payload as
                    | (typeof data)[number]
                    | undefined;
                  return active && slice ? (
                    <div className="max-w-72 break-all rounded-xl border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md">
                      <p>{slice.label}</p>
                      <p className="mt-1">
                        <TransactionAmount value={slice.value} />
                      </p>
                    </div>
                  ) : null;
                }}
              />
            </PieChart>
          ) : (
            <div className="size-full rounded-full border-[18px] border-secondary" />
          )}
          <div className="pointer-events-none absolute inset-8 flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-xs text-muted-foreground">
              {totals.fee === null
                ? "Outputs"
                : totals.input === null
                  ? "Total"
                  : "Total input"}
            </span>
            <span
              className="max-w-full break-words text-sm font-extrabold tabular-nums"
              title={total === null ? undefined : `${metricDuffs(total)} DASH`}
            >
              {total === null
                ? "—"
                : metricDuffs(total, total < 10_000 ? 8 : 4)}
            </span>
            <span className="text-xs text-muted-foreground">DASH</span>
          </div>
        </div>
        <div className="min-w-0 w-full space-y-4">
          <div>
            <h2 className="text-xl font-extrabold">Value distribution</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {totals.fee === null ? "Transaction outputs" : "Outputs and fee"}
            </p>
          </div>
          {totals.output === null ? (
            <MissingApiData
              inline
              description="Return the value of every transaction output in duffs."
            />
          ) : data.length ? (
            <ul className="space-y-3">
              {data.map((slice) => (
                <li
                  key={slice.label}
                  className="flex min-w-0 items-center gap-2 text-sm"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.fill }}
                  />
                  <span className="min-w-0 flex-1 truncate" title={slice.label}>
                    {slice.address ? (
                      <AddressLink
                        address={slice.address}
                        className="block truncate font-mono text-accent hover:underline"
                      />
                    ) : (
                      slice.label
                    )}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums">
                    <TransactionAmount value={slice.value} />
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {metricNumber((slice.value / (total || 1)) * 100, 1)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No output value.</p>
          )}
        </div>
      </div>
      <dl
        className={`grid grid-cols-1 gap-3 ${totals.input === null ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
      >
        {[
          { label: "Total input", value: totals.input },
          { label: "Total output", value: totals.output },
          { label: "Fee", value: totals.fee },
        ]
          .filter(
            ({ label }) => label !== "Total input" || totals.input !== null,
          )
          .map(({ label, value }) => (
            <div
              key={label}
              className="min-w-0 rounded-3xl bg-secondary px-4 py-4"
            >
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-2 break-words text-base font-extrabold text-brand">
                {label === "Fee" && !totals.feeApplicable ? (
                  <span className="text-sm font-medium text-muted-foreground">
                    Not applicable
                  </span>
                ) : (
                  <TransactionAmount value={value} />
                )}
              </dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
