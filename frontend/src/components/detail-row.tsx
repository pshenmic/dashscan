import { Info } from "lucide-react";

export function DetailRow({
  label,
  children,
  variant = "compact",
}: {
  label: string;
  children: React.ReactNode;
  variant?: "compact" | "labeled";
}) {
  if (variant === "labeled") {
    return (
      <div className="flex items-center gap-4 py-3">
        <Info className="size-4 shrink-0 text-muted-foreground" />
        <span className="w-28 shrink-0 text-sm text-muted-foreground">
          {label}
        </span>
        <div className="flex min-w-0 items-center text-sm">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center text-xs">{children}</div>
    </div>
  );
}
