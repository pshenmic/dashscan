import { useClockValue } from "@/components/render-clock";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime, formatNumber } from "@/lib/format";

export function BlockAge({
  timestamp,
  blockHeight,
}: {
  timestamp: string;
  blockHeight?: number | null;
}) {
  const seconds = useClockValue((value) => {
    const elapsed = Math.max(0, (value - Date.parse(timestamp)) / 1000);
    return elapsed < 60 ? Math.floor(elapsed) : Math.floor(elapsed / 60) * 60;
  });
  if (!Number.isFinite(seconds)) return "—";
  const age =
    seconds < 60
      ? `${seconds}s`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m`
        : seconds < 86400
          ? `${Math.floor(seconds / 3600)}h`
          : `${formatNumber(Math.floor(seconds / 86400))}d`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="min-w-[72px] rounded-sm text-right tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
        >
          <time dateTime={timestamp}>{age} ago</time>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p>{formatDateTime(timestamp)}</p>
        {blockHeight != null && <p>Block #{formatNumber(blockHeight)}</p>}
        {blockHeight != null && (
          <p>
            Timestamp of the containing block, not when the transaction was
            first seen.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
