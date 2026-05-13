import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/themes/neo/components/copy-button";

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
  const truncated = truncateMiddle(value, head, tail);
  const isTruncated = variant === "compact" && truncated !== value;

  const textClass = cn(
    "font-mono text-sm tabular-nums",
    href && "text-accent hover:underline underline-offset-2",
    variant === "full" && "break-all",
    className,
  );

  const renderText = (content: string) => (
    <span className={textClass}>{content}</span>
  );

  const linkWrap = (children: React.ReactNode) =>
    href ? (
      params ? (
        <Link
          // biome-ignore lint/suspicious/noExplicitAny: TanStack Router typed routes accept this dynamically
          to={href as any}
          // biome-ignore lint/suspicious/noExplicitAny: dynamic params for typed router
          params={params as any}
          className="no-underline"
        >
          {children}
        </Link>
      ) : (
        <Link
          // biome-ignore lint/suspicious/noExplicitAny: TanStack Router typed routes accept this dynamically
          to={href as any}
          className="no-underline"
        >
          {children}
        </Link>
      )
    ) : (
      children
    );

  const inner = isTruncated ? (
    <span className="hash-expand" title={value}>
      <span className="hash-expand__truncated">{renderText(truncated)}</span>
      <span className="hash-expand__full" aria-hidden>
        {renderText(value)}
      </span>
    </span>
  ) : (
    renderText(variant === "compact" ? truncated : value)
  );

  return (
    <span className="inline-flex items-center gap-1">
      {linkWrap(inner)}
      {copy && <CopyButton value={value} />}
    </span>
  );
}
