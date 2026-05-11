import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function MiniStatCard({
  icon,
  label,
  value,
  bgImage,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  bgImage?: string;
}) {
  return (
    <Card className="relative flex h-[92px] flex-row items-center gap-4 overflow-hidden rounded-2xl border-0 bg-white px-5 py-0 shadow-none">
      {bgImage ? (
        <div
          className="pointer-events-none absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url('${bgImage}')`,
            backgroundPosition: "top right",
            backgroundSize: "cover",
          }}
          aria-hidden
        />
      ) : null}
      <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-white text-accent">
        {icon}
      </div>
      <div className="relative flex min-w-0 flex-col gap-1">
        <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5 text-[20px] font-extrabold tracking-[-0.02em] text-[#10213f]">
          {value}
        </div>
      </div>
    </Card>
  );
}
