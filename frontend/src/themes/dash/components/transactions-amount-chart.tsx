import { useCallback } from "react";
import { formatDateTime } from "@/lib/format";
import { AreaChart } from "@/themes/dash/components/area-chart";

type Point = { timestamp: string; count: number };

type TransactionsAmountChartProps = {
  data: Point[];
  className?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const getValue = (d: Point) => d.count;
const getKey = (d: Point) => d.timestamp;

function formatTooltipTime(timestamp: string): string {
  return formatDateTime(new Date(timestamp), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTooltip(item: Point) {
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
  const spanMs =
    data.length < 2
      ? 0
      : new Date(data[data.length - 1].timestamp).getTime() -
        new Date(data[0].timestamp).getTime();

  const getXLabel = useCallback(
    (d: Point) => {
      const date = new Date(d.timestamp);
      if (spanMs < DAY_MS) {
        return formatDateTime(date, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
      return formatDateTime(date, {
        month: "short",
        day: "numeric",
      });
    },
    [spanMs],
  );

  return (
    <AreaChart
      data={data}
      getValue={getValue}
      getKey={getKey}
      getXLabel={getXLabel}
      renderTooltip={renderTooltip}
      ariaLabel="Transactions amount chart"
      className={className}
    />
  );
}
