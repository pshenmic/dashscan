import type { ApiTransaction } from "@/lib/api/types";

export function assetTransferAmount(transaction: ApiTransaction | undefined) {
  if (!transaction) return null;
  if (transaction.type === "ASSET_UNLOCK") {
    return transaction.amount != null && /^\d+$/.test(transaction.amount)
      ? transaction.amount
      : null;
  }
  if (transaction.type !== "ASSET_LOCK") return null;
  const payload = transaction.extraPayload;
  if (
    !payload ||
    !("outputs" in payload) ||
    !Array.isArray(payload.outputs) ||
    !payload.outputs.length ||
    payload.outputs.some(
      (output) =>
        typeof output.satoshis !== "string" || !/^\d+$/.test(output.satoshis),
    )
  )
    return null;
  return payload.outputs
    .reduce((sum, output) => sum + BigInt(output.satoshis), 0n)
    .toString();
}
