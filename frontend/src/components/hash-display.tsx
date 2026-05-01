import { Link } from "@tanstack/react-router";
import { CopyButton } from "@/components/copy-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HashDisplayProps {
  value: string;
  href?: string;
  params?: Record<string, string>;
  variant?: "compact" | "full";
  copy?: boolean;
  className?: string;
  head?: number;
  tail?: number;
}

function truncateMiddle(value: string, head: number, tail: number) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function HashDisplay({
  value,
  href,
  params,
  variant = "compact",
  copy = true,
  className,
  head = 8,
  tail = 6,
}: HashDisplayProps) {
  const display =
    variant === "compact" ? truncateMiddle(value, head, tail) : value;

  const text = (
    <span
      className={cn(
        "font-mono text-sm tabular-nums",
        href && "text-accent hover:underline underline-offset-2",
        variant === "full" && "break-all",
        className,
      )}
    >
      {display}
    </span>
  );

  const linked = href ? (
    params ? (
      <Link
        // biome-ignore lint/suspicious/noExplicitAny: TanStack Router typed routes accept this dynamically
        to={href as any}
        // biome-ignore lint/suspicious/noExplicitAny: dynamic params for typed router
        params={params as any}
        className="no-underline"
      >
        {text}
      </Link>
    ) : (
      <Link
        // biome-ignore lint/suspicious/noExplicitAny: TanStack Router typed routes accept this dynamically
        to={href as any}
        className="no-underline"
      >
        {text}
      </Link>
    )
  ) : (
    text
  );

  return (
    <TooltipProvider delayDuration={150}>
      <span className="inline-flex items-center gap-1">
        {variant === "compact" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{linked}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-xs">
              {value}
            </TooltipContent>
          </Tooltip>
        ) : (
          linked
        )}
        {copy && <CopyButton value={value} />}
      </span>
    </TooltipProvider>
  );
}
