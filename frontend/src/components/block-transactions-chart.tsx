import { cn } from "@/lib/utils";

type BlockTransactionsChartProps = {
  data: { height: number; txCount: number }[];
  className?: string;
};

export function BlockTransactionsChart({
  data,
  className,
}: BlockTransactionsChartProps) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => a.height - b.height);
  const maxCount = Math.max(...sorted.map((d) => d.txCount), 1);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="relative">
        <div className="flex items-end justify-center gap-[clamp(2px,0.5vw,8px)]">
          {sorted.map((entry) => {
            const normalizedHeight = (entry.txCount / maxCount) * 100;
            return (
              <div key={entry.height} className="relative flex min-w-0 flex-1 justify-center">
                <div
                  className="group h-[40px] w-[10px] min-w-[4px] cursor-pointer rounded-full bg-accent/32 transition-all hover:bg-accent hover:shadow-[0_0_12px_4px_oklch(from_var(--accent)_l_c_h/0.25)]"
                  style={{
                    marginBottom: `${normalizedHeight}px`,
                  }}
                >
                  <div className="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                    #{entry.height} · {entry.txCount} txs
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="relative mt-2 flex h-4 justify-center gap-[clamp(2px,0.5vw,8px)]">
          {sorted.map((entry, i) => {
            const showLabel = i % 10 === 0 || i === sorted.length - 1;
            return (
              <span
                key={entry.height}
                className="relative min-w-0 flex-1 text-[9px] text-muted-foreground"
              >
                {showLabel && (
                  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                    #{entry.height}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
