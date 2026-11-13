import type { LucideIcon } from "lucide-react";

export function CardDecoration({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden="true"
      data-card-decoration
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] forced-colors:hidden"
      style={{ maskImage: "linear-gradient(225deg, black, transparent 80%)" }}
    >
      <Icon
        className="absolute -right-10 -top-10 size-44 -rotate-[25deg] text-brand opacity-[0.12] dark:text-accent dark:opacity-[0.16]"
        strokeWidth={1.25}
      />
    </span>
  );
}
