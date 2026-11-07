import type { ApiTransaction } from "@/lib/api/types";
import { txTypeNum } from "@/lib/transaction-types";

export function transactionAmount(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function sumAmounts(values: unknown[]): number | null {
  let total = 0;
  for (const value of values) {
    const amount = transactionAmount(value);
    if (amount === null) return null;
    total += amount;
    if (!Number.isSafeInteger(total)) return null;
  }
  return total;
}

export function transactionTotals(transaction: ApiTransaction) {
  const type = txTypeNum(transaction.type);
  const coinbase =
    type === 5 ||
    transaction.vIn?.some(
      (input) => input.prevTxHash === null && input.vOutIndex === null,
    ) === true;
  const input =
    !coinbase && transaction.vIn?.length
      ? sumAmounts(transaction.vIn.map((item) => item.amount))
      : null;
  const output = Array.isArray(transaction.vOut)
    ? sumAmounts(transaction.vOut.map((item) => item.value))
    : null;
  const fee =
    !coinbase &&
    type >= 0 &&
    type <= 4 &&
    input !== null &&
    output !== null &&
    input >= output
      ? input - output
      : null;
  return { input, output, fee, coinbase };
}

export type TransactionTotals = ReturnType<typeof transactionTotals>;
