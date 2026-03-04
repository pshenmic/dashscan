function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`h-5 rounded-md bg-muted-foreground/10 ${className ?? ""}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, oklch(from var(--muted-foreground) l c h / 0.12) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}

function SkeletonRow({
  widths,
  index = 0,
}: {
  widths: string[];
  index?: number;
}) {
  return (
    <tr
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {widths.map((w, i) => {
        const isFirst = i === 0;
        const isLast = i === widths.length - 1;
        return (
          <td
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
            key={i}
            className={`border-y border-border bg-secondary/50 px-3 py-2 ${isFirst ? "rounded-l-xl border-l" : ""} ${isLast ? "rounded-r-xl border-r" : ""}`}
          >
            <SkeletonBar className={w} />
          </td>
        );
      })}
    </tr>
  );
}

export { SkeletonBar, SkeletonRow };
