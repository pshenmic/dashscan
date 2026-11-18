import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function StatCard({
  icon,
  label,
  value,
  bgImage,
  adornment,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  bgImage: string;
  adornment?: ReactNode;
}) {
  return (
    <Card className="relative h-full min-h-[152px] gap-0 overflow-hidden rounded-3xl border-0 bg-card p-5 shadow-none">
      <div
        className="pointer-events-none absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundPosition: "top right",
          backgroundSize: "cover",
        }}
        aria-hidden
      />
      <div className="relative flex size-12 shrink-0 self-start items-center justify-center rounded-full border border-accent/20 text-accent">
        {icon}
      </div>
      <div className="relative mt-3">
        <div className="flex items-center gap-2">
          <p className="dash-metric text-card-foreground">{value}</p>
          {adornment}
        </div>
        <p className="dash-body-compact mt-1 text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
