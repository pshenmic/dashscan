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
}: {
  type: string | number | null | undefined;
}) {
  const metadata = getTransactionType(type);
  const label = getTxTypeLabel(type);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          tabIndex={0}
          className={`h-6 max-w-40 font-medium ${getTxTypeBadgeStyle(type)}`}
        >
          <span className="truncate">{label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        {metadata ? `${label}: ${metadata.description}` : label}
      </TooltipContent>
    </Tooltip>
  );
}
