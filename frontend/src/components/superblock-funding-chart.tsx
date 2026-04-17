import { AreaChart } from "@/components/area-chart";

type SuperblockFundingChartProps = {
  data: { label: string; value: number }[];
  className?: string;
};

const getValue = (d: { value: number }) => d.value;
const getKey = (d: { label: string }) => d.label;
const getXLabel = (d: { label: string }) => d.label;

function Tooltip({ item }: { item: { label: string; value: number } }) {
  return (
    <>
      <div className="font-semibold text-[#21314d]">
        Payout: {item.value.toLocaleString()} Ð
      </div>
      <div className="mt-0.5 text-[#7f8da8]">{item.label}</div>
    </>
  );
}

export function SuperblockFundingChart({
  data,
  className,
}: SuperblockFundingChartProps) {
  return (
    <AreaChart
      data={data}
      getValue={getValue}
      getKey={getKey}
      getXLabel={getXLabel}
      renderTooltip={(item) => <Tooltip item={item} />}
      ariaLabel="Superblock funding chart"
      className={className}
    />
  );
}
