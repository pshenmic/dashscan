import type { ApiAddressBalanceEntry } from "@/lib/api/types";

export function addressDistribution(
  entries: ApiAddressBalanceEntry[] | undefined,
) {
  if (!entries?.length || !entries.some((entry) => entry.address === "others"))
    return null;
  if (
    entries.some(
      (entry) => entry.balance == null || !/^\d+$/.test(entry.balance),
    )
  )
    return null;
  const ranked = entries.filter(
    (entry) => entry.address && entry.address !== "others",
  );
  const sum = (rows: ApiAddressBalanceEntry[]) =>
    rows.reduce((total, entry) => total + BigInt(entry.balance as string), 0n);
  const total = sum(entries);
  if (total === 0n) return { total: "0", shares: null, topTen: null };
  const groups = [
    sum(ranked.slice(0, 1)),
    sum(ranked.slice(1, 5)),
    sum(ranked.slice(5, 10)),
  ];
  const top = groups.reduce((subtotal, amount) => subtotal + amount, 0n);
  const percentage = (amount: bigint) =>
    Number((amount * 1_000_000n) / total) / 10_000;
  return {
    total: total.toString(),
    shares: [...groups, total - top].map(percentage),
    topTen: percentage(top),
  };
}
