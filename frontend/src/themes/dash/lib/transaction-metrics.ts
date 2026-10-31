import type { ApiTransactionsStatsEntry } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

const DAY_MS = 86_400_000;

export function transactionHistoryRange(now: number) {
  const end = Math.floor(now / DAY_MS) * DAY_MS;
  return {
    timestampStart: new Date(end - 60 * DAY_MS).toISOString(),
    timestampEnd: new Date(end).toISOString(),
    intervalsCount: 60,
  };
}

export function transactionHistorySummary(
  entries: ApiTransactionsStatsEntry[] | undefined,
  end: string,
) {
  const endTime = Date.parse(end);
  const midpoint = endTime - 30 * DAY_MS;
  const startTime = endTime - 60 * DAY_MS;
  const valid = (entries ?? [])
    .filter((entry) => {
      const time = Date.parse(entry.timestamp);
      return (
        Number.isFinite(entry.data?.count) &&
        entry.data.count >= 0 &&
        time >= startTime &&
        time < endTime
      );
    })
    .sort(
      (first, second) =>
        Date.parse(first.timestamp) - Date.parse(second.timestamp),
    );
  const current = valid.filter(
    (entry) => Date.parse(entry.timestamp) >= midpoint,
  );
  const previous = valid.filter(
    (entry) => Date.parse(entry.timestamp) < midpoint,
  );
  const currentTotal = current.length
    ? current.reduce((total, entry) => total + entry.data.count, 0)
    : null;
  const previousTotal = previous.length
    ? previous.reduce((total, entry) => total + entry.data.count, 0)
    : null;
  const change =
    currentTotal !== null && previousTotal !== null && previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : null;
  return { current, currentTotal, previousTotal, change };
}

export function transactionAmount(amount: string | null | undefined) {
  if (amount == null || !/^\d+$/.test(amount)) return "—";
  const duffs = BigInt(amount);
  const whole = duffs / 100_000_000n;
  const fraction = (duffs % 100_000_000n)
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "");
  return `${formatNumber(whole)}${fraction ? `.${fraction}` : ""} DASH`;
}
