function SkeletonBar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-5 max-w-full rounded-md bg-muted-foreground/10 motion-safe:animate-[shimmer_1.5s_ease-in-out_infinite] ${className ?? ""}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, oklch(from var(--muted-foreground) l c h / 0.12) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

function SkeletonRow({
  widths,
  variant = "default",
}: {
  widths: string[];
  variant?: "default" | "plain";
}) {
  return (
    <tr data-loading="true">
      {widths.map((w, i) => {
        const isFirst = i === 0;
        const isLast = i === widths.length - 1;
        return (
          <td
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
            key={i}
            className={
              variant === "plain"
                ? `bg-secondary/60 px-3 py-3 ${isFirst ? "rounded-l-xl" : ""} ${isLast ? "rounded-r-xl" : ""}`
                : `border-y border-border bg-secondary/50 px-3 py-2 ${isFirst ? "rounded-l-xl border-l" : ""} ${isLast ? "rounded-r-xl border-r" : ""}`
            }
          >
            <SkeletonBar className={w} />
          </td>
        );
      })}
    </tr>
  );
}

export { SkeletonBar, SkeletonRow };
