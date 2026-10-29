import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function HomeTable({ className, ...props }: ComponentProps<"table">) {
  return (
    <table
      className={cn(
        "w-full table-auto text-left text-sm [&_td:not([data-grow])]:w-px [&_td:not([data-grow])]:whitespace-nowrap [&_td[data-grow]]:min-w-40",
        className,
      )}
      {...props}
    />
  );
}
