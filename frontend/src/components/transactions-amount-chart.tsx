import { useMemo } from "react";
import { AreaChart } from "@/components/area-chart";

type TransactionsAmountChartProps = {
  data: { timestamp: string; count: number }[];
  className?: string;
};

const getValue = (d: { count: number }) => d.count;
const getKey = (d: { timestamp: string }) => d.timestamp;

function formatTooltipTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Tooltip({ item }: { item: { timestamp: string; count: number } }) {
  return (
    <>
      <div className="font-semibold text-[#21314d]">{item.count} TXs</div>
      <div className="mt-0.5 text-[#7f8da8]">
        {formatTooltipTime(item.timestamp)}
      </div>
    </>
  );
}

export function TransactionsAmountChart({
  data,
  className,
}: TransactionsAmountChartProps) {
  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [data],
  );

  const spanMs = useMemo(() => {
    if (sorted.length < 2) return 0;
    return (
      new Date(sorted[sorted.length - 1].timestamp).getTime() -
      new Date(sorted[0].timestamp).getTime()
    );
  }, [sorted]);

  const getXLabel = (d: { timestamp: string }) => {
    const date = new Date(d.timestamp);
    if (spanMs < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <AreaChart
      data={sorted}
      getValue={getValue}
      getKey={getKey}
      getXLabel={getXLabel}
      renderTooltip={(item) => <Tooltip item={item} />}
      ariaLabel="Transactions amount chart"
      className={className}
    />
  );
}
