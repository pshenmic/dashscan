import { useMemo } from "react";
import { AreaChart } from "@/components/area-chart";

type BlockTransactionsChartProps = {
  data: { height: number; txCount: number }[];
  className?: string;
};

const getValue = (d: { txCount: number }) => d.txCount;
const getKey = (d: { height: number }) => d.height;
const getXLabel = (d: { height: number }) => `#${d.height}`;

function Tooltip({ item }: { item: { height: number; txCount: number } }) {
  return (
    <>
      <div className="font-semibold text-[#21314d]">{item.txCount} TXs</div>
      <div className="mt-0.5 text-[#7f8da8]">#{item.height}</div>
    </>
  );
}

export function BlockTransactionsChart({
  data,
  className,
}: BlockTransactionsChartProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.height - b.height),
    [data],
  );

  return (
    <AreaChart
      data={sorted}
      getValue={getValue}
      getKey={getKey}
      getXLabel={getXLabel}
      renderTooltip={(item) => <Tooltip item={item} />}
      ariaLabel="Block transactions chart"
      className={className}
    />
  );
}
