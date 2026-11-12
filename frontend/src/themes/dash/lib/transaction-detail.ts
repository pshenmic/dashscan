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
  const monetary = type !== 6 && type !== 7;
  const feeApplicable = !coinbase && monetary;
  const fee =
    type === 9 && transaction.extraPayload && "fee" in transaction.extraPayload
      ? transactionAmount(transaction.extraPayload.fee)
      : feeApplicable &&
          ((type >= 0 && type <= 4) || type === 8) &&
          input !== null &&
          output !== null &&
          input >= output
        ? input - output
        : null;
  return { input, output, fee, coinbase, monetary, feeApplicable };
}

export type TransactionTotals = ReturnType<typeof transactionTotals>;
