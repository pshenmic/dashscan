import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DetailRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function DetailRow({ label, children, className }: DetailRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-border/60 pb-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0",
        className,
      )}
    >
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="flex flex-wrap items-center gap-2 text-sm">{children}</dd>
    </div>
  );
}
