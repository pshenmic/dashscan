import { cn } from "@/lib/utils";

export function HomeIcon({
  name,
  className,
}: {
  name: "color-mode" | "theme" | "search" | "chevron-down" | "explore";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-4 shrink-0 bg-current", className)}
      style={{
        mask: `url('/icons/home/${name}.svg') center / contain no-repeat`,
      }}
    />
  );
}
