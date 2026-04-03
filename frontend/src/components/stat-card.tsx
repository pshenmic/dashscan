import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

function StatIcon({ children }: { children: ReactNode }) {
  return (
    <div className="-ml-px flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-[24px] border border-accent/12 bg-white text-accent">
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  adornment,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  adornment?: ReactNode;
}) {
  return (
    <Card className="h-[96px] flex-row items-center gap-0 overflow-visible rounded-[24px] border bg-white p-0">
      <StatIcon>{icon}</StatIcon>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-muted-foreground">
            {label}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <p className="truncate text-[20px] font-extrabold tracking-[-0.02em] text-[#10213f] sm:text-[22px]">
              {value}
            </p>
            {adornment}
          </div>
        </div>
      </div>
    </Card>
  );
}
