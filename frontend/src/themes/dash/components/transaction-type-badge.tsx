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
  size = "table",
  filter,
}: {
  type: string | number | null | undefined;
  withTooltip?: boolean;
  size?: "table" | "stat";
  filter?: { apply: () => void; selected: boolean; duplicate: boolean };
}) {
  const metadata = getTransactionType(type);
  const label = getTxTypeLabel(type);
  const badge = (
    <Badge
      variant="outline"
      asChild={!!filter}
      tabIndex={!filter && withTooltip ? 0 : undefined}
      className={`${size === "stat" ? "h-9 px-2.5" : "h-6"} max-w-40 font-medium ${getTxTypeBadgeStyle(type)}`}
    >
      {filter ? (
        <button
          type="button"
          onClick={filter.apply}
          tabIndex={filter.duplicate ? -1 : 0}
          aria-label={`Filter transactions: ${label}`}
          aria-pressed={filter.selected}
          className="cursor-pointer hover:underline aria-pressed:ring-1 aria-pressed:ring-current"
        >
          <span className="truncate">{label}</span>
        </button>
      ) : (
        <span className="truncate">{label}</span>
      )}
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
