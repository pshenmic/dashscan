import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  delta?: { value: number; label?: string } | null;
  hint?: ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  delta,
  hint,
  isLoading,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground [&>svg]:size-3.5">
            {icon}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums">
            {value}
          </span>
        )}
        {(hint || delta) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  delta.value > 0 && "text-success",
                  delta.value < 0 && "text-destructive",
                )}
              >
                {delta.value > 0 ? (
                  <ArrowUp className="size-3" />
                ) : delta.value < 0 ? (
                  <ArrowDown className="size-3" />
                ) : null}
                {Math.abs(delta.value).toFixed(2)}%
                {delta.label ? ` ${delta.label}` : ""}
              </span>
            )}
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
