import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { priceQueryOptions } from "@/lib/api/price";
import { formatCompactUsd } from "@/lib/format";
import type { Network } from "@/lib/store";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";
import { FormattedAmount } from "./formatted-amount";

export function useAddressUsdPrice(network: Network, enabled = true) {
  const price = useQuery({
    ...priceQueryOptions({ network, currency: "usd" }),
    enabled,
  });
  const usd = price.data?.usd;
  return enabled &&
    !price.isError &&
    usd != null &&
    Number.isFinite(usd) &&
    usd > 0
    ? usd
    : null;
}

export function AddressBalance({
  balance,
  usdPrice,
}: {
  balance?: string | null;
  usdPrice: number | null;
}) {
  const value = transactionAmount(balance).replace(/ DASH$/, "");
  const amount = <FormattedAmount value={value} />;
  if (value === "—" || usdPrice == null) return amount;
  const usd = (Number(balance) / 100_000_000) * usdPrice;
  if (!Number.isFinite(usd)) return amount;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="cursor-help rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {amount}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        ≈ {formatCompactUsd(usd)} at the mainnet DASH rate
      </TooltipContent>
    </Tooltip>
  );
}
