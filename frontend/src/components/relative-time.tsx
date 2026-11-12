import { useNow } from "@/components/render-clock";
import { formatRelativeTime } from "@/lib/format";

export function RelativeTime({ timestamp }: { timestamp: string | number }) {
  const now = useNow();
  return <>{formatRelativeTime(timestamp, now)}</>;
}
