import { cn } from "@/lib/utils";

type Candle = {
  label: string;
  low: number;
  high: number;
  open: number;
  close: number;
};

type CandlestickChartProps = {
  candles: Candle[];
  className?: string;
};

export function CandlestickChart({
  candles,
  className,
}: CandlestickChartProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className="relative flex items-end justify-center gap-[18px] h-48"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "6px 30px",
          backgroundPosition: "0 -1px",
        }}
      >
        {candles.map((candle) => {
          const isPositive = candle.close > candle.open;
          const bodyBottom = Math.min(candle.open, candle.close);
          const bodyHeight = Math.abs(candle.close - candle.open);
          const color = isPositive ? "accent" : "primary";

          return (
            <div
              key={candle.label}
              className="group relative h-full w-[12px] cursor-pointer"
            >
              <div
                className={cn(
                  "absolute left-1/2 w-[2px] -translate-x-1/2 rounded-full transition-shadow",
                  `bg-${color}`,
                )}
                style={{
                  bottom: `${candle.low}%`,
                  height: `${candle.high - candle.low}%`,
                }}
              />
              <div
                className={cn(
                  "absolute w-[12px] rounded-full transition-shadow",
                  `bg-${color}`,
                  isPositive
                    ? "group-hover:shadow-[0_0_12px_4px_oklch(from_var(--accent)_l_c_h/0.25)]"
                    : "group-hover:shadow-[0_0_12px_4px_oklch(from_var(--primary)_l_c_h/0.25)]",
                )}
                style={{
                  bottom: `${bodyBottom}%`,
                  height: `${bodyHeight}%`,
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1.5 text-xs text-background group-hover:block"
                style={{ bottom: `${candle.high + 2}%` }}
              >
                <div className="flex flex-col gap-0.5">
                  <span>O: {candle.open}</span>
                  <span>H: {candle.high}</span>
                  <span>L: {candle.low}</span>
                  <span>C: {candle.close}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center gap-[18px]">
        {candles.map((candle) => (
          <span
            key={candle.label}
            className="w-[12px] text-center text-xs text-muted-foreground"
          >
            {candle.label}
          </span>
        ))}
      </div>
    </div>
  );
}
