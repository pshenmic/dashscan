import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getTransactionType,
  getTxTypeBadgeStyle,
  getTxTypeLabel,
} from "@/lib/transaction-types";

export function TransactionTypeBadge({
  type,
  withTooltip = true,
}: {
  type: string | number | null | undefined;
  withTooltip?: boolean;
}) {
  const metadata = getTransactionType(type);
  const label = getTxTypeLabel(type);
  const badge = (
    <Badge
      variant="outline"
      tabIndex={withTooltip ? 0 : undefined}
      className={`h-6 max-w-40 font-medium ${getTxTypeBadgeStyle(type)}`}
    >
      <span className="truncate">{label}</span>
    </Badge>
  );
  if (!withTooltip) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-72">
        {metadata ? `${label}: ${metadata.description}` : label}
      </TooltipContent>
    </Tooltip>
  );
}
