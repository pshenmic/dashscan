import {
  ArrowLeftRight,
  Crown,
  PieChart as PieIcon,
  Shuffle,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiTransactionsBreakdown } from "@/lib/api/types";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/themes/neo/components/empty-state";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";

const BREAKDOWN_COLORS = {
  normal: "var(--accent)",
  coinjoin: "var(--accent-teal)",
  multisig: "var(--accent-violet)",
  special: "var(--accent-lime)",
} as const;

const chartConfig: ChartConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
};

export function TxBreakdownCard({
  breakdown,
  isLoading,
  className,
}: {
  breakdown: ApiTransactionsBreakdown | null;
  isLoading: boolean;
  className?: string;
}) {
  const total = breakdown?.total ?? 0;
  const data = useMemo(() => {
    if (!breakdown) return [];
    return [
      {
        key: "normal" as const,
        label: "Normal",
        value: breakdown.normal ?? 0,
        color: BREAKDOWN_COLORS.normal,
        icon: <ArrowLeftRight className="size-3" />,
      },
      {
        key: "special" as const,
        label: "Special",
        value: breakdown.special ?? 0,
        color: BREAKDOWN_COLORS.special,
        icon: <Crown className="size-3" />,
      },
      {
        key: "coinjoin" as const,
        label: "CoinJoin",
        value: breakdown.coinjoin ?? 0,
        color: BREAKDOWN_COLORS.coinjoin,
        icon: <Shuffle className="size-3" />,
      },
      {
        key: "multisig" as const,
        label: "Multisig",
        value: breakdown.multisig ?? 0,
        color: BREAKDOWN_COLORS.multisig,
        icon: <Users className="size-3" />,
      },
    ];
  }, [breakdown]);
  const nonZero = data.filter((d) => d.value > 0);
  return (
    <Card className={cn("lg:col-span-5", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          24h Tx Composition
        </CardTitle>
        <CardDescription>
          Confirmed transactions by type (priority bucketing)
        </CardDescription>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
            <PieIcon className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {isLoading ? (
          <Skeleton className="h-[200px] w-full flex-1" />
        ) : total === 0 ? (
          <EmptyState title="No transactions in last 24h" />
        ) : (
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-stretch">
            <div className="relative size-40 shrink-0 self-center">
              <ChartContainer
                config={chartConfig}
                className="aspect-square size-40"
              >
                <PieChart>
                  <Pie
                    data={nonZero}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="var(--background)"
                    strokeWidth={2}
                  >
                    {nonZero.map((slice) => (
                      <Cell key={slice.key} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display-num text-2xl tabular-nums">
                  {formatCompact(total)}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Total
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-2 py-1">
              {data.map((slice) => {
                const pct = total > 0 ? (slice.value / total) * 100 : 0;
                return (
                  <div key={slice.key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: slice.color }}
                        />
                        <span className="inline-flex items-center gap-1 text-sm">
                          {slice.icon}
                          {slice.label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 font-mono tabular-nums">
                        <span className="text-sm">
                          {slice.value.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary/60">
                      <div
                        className="h-full transition-all"
                        style={{
                          background: slice.color,
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
