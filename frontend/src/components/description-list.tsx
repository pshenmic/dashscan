import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DescriptionItem {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

interface DescriptionListProps {
  items: DescriptionItem[];
  columns?: 1 | 2;
  className?: string;
}

export function DescriptionList({
  items,
  columns = 2,
  className,
}: DescriptionListProps) {
  return (
    <dl
      className={cn(
        "grid gap-y-4 gap-x-8",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
        >
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </dt>
          <dd className="flex min-h-[20px] flex-wrap items-center gap-2 text-sm text-foreground">
            {item.value}
          </dd>
          {item.hint && (
            <span className="text-xs text-muted-foreground">{item.hint}</span>
          )}
        </div>
      ))}
    </dl>
  );
}
