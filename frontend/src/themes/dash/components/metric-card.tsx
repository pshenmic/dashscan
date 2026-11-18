import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";
import { CardDecoration } from "./card-decoration";
import { InfoPopover } from "./info-popover";

export function MetricCard({
  label,
  icon: Icon,
  description,
  detail,
  compact = false,
  children,
}: {
  label: string;
  icon: LucideIcon;
  description: ReactNode;
  detail?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <article
      aria-labelledby={labelId}
      className={cn(
        "@container relative isolate flex min-h-[164px] min-w-0 flex-col gap-4 overflow-hidden rounded-3xl dash-home-panel p-4 sm:p-5",
        compact && "min-h-[112px] justify-between gap-3 sm:p-4",
      )}
    >
      <CardDecoration icon={Icon} />
      <div
        className={cn("flex min-w-0 items-center gap-3", compact && "gap-2")}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full bg-action-subtle text-accent",
            compact && "size-7",
          )}
        >
          <Icon
            aria-hidden="true"
            className={compact ? "size-3.5" : "size-4"}
            strokeWidth={1.75}
          />
        </span>
        <h2
          id={labelId}
          className="min-w-0 text-sm font-medium leading-tight text-muted-foreground"
        >
          <InfoPopover label={label} trigger={label}>
            {description}
          </InfoPopover>
        </h2>
      </div>
      <div
        className={cn(
          "min-w-0 break-words text-xl @[15rem]:text-2xl font-semibold leading-tight tabular-nums text-foreground",
          compact && "text-base @[9rem]:text-lg",
        )}
      >
        {children}
      </div>
      {detail != null && (
        <div className="mt-auto flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
          {detail}
        </div>
      )}
    </article>
  );
}
