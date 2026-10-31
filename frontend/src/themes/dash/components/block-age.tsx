import { useNow } from "@/components/render-clock";
import { formatDateTime, formatNumber } from "@/lib/format";

export function BlockAge({ timestamp }: { timestamp: string }) {
  const now = useNow();
  const seconds = Math.max(0, Math.floor((now - Date.parse(timestamp)) / 1000));
  if (!Number.isFinite(seconds)) return "—";
  const age =
    seconds < 60
      ? `${seconds}s`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
        : seconds < 86400
          ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
          : `${formatNumber(Math.floor(seconds / 86400))}d`;
  return (
    <time
      className="inline-block min-w-[64px] tabular-nums"
      dateTime={timestamp}
      title={formatDateTime(timestamp)}
    >
      {age}
      <span className="sr-only"> ago</span>
    </time>
  );
}
