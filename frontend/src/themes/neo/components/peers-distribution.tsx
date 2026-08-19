import { CircleCheck, Waypoints } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiPeerUserAgent } from "@/lib/api/peers";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/themes/neo/components/empty-state";
import type { PeerStatusFilter } from "@/themes/neo/components/peers-filter-bar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";

const USER_AGENT_COLORS = [
  "var(--accent)",
  "var(--accent-teal)",
  "var(--accent-violet)",
  "var(--accent-lime)",
  "var(--chart-4)",
] as const;

const OTHER_COLOR =
  "color-mix(in oklab, var(--muted-foreground) 28%, transparent)";

const statusConfig = {
  available: { label: "Available", color: "var(--success)" },
  unavailable: { label: "Unavailable", color: "var(--destructive)" },
} satisfies ChartConfig;

type ChartSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
  selectionValue: string;
  filterValue?: string;
};

export function PeersDistribution({
  total,
  available,
  userAgents,
  isLoading,
  status,
  userAgent,
  onStatusChange,
  onUserAgentChange,
}: {
  total: number;
  available: number;
  userAgents: ApiPeerUserAgent[];
  isLoading: boolean;
  status: PeerStatusFilter;
  userAgent: string | null;
  onStatusChange: (value: PeerStatusFilter) => void;
  onUserAgentChange: (value: string | null) => void;
}) {
  const statusData = useMemo<ChartSlice[]>(
    () => [
      {
        key: "available",
        label: "Available",
        value: available,
        color: "var(--success)",
        selectionValue: "available",
        filterValue: "available",
      },
      {
        key: "unavailable",
        label: "Unavailable",
        value: Math.max(0, total - available),
        color: "var(--destructive)",
        selectionValue: "unavailable",
        filterValue: "unavailable",
      },
    ],
    [available, total],
  );

  const agentData = useMemo<ChartSlice[]>(() => {
    const top: ChartSlice[] = userAgents
      .slice(0, USER_AGENT_COLORS.length)
      .map((item, i) => ({
        key: `agent-${i}`,
        label: item.userAgent,
        value: item.count,
        color: USER_AGENT_COLORS[i],
        selectionValue: item.userAgent,
        filterValue: item.userAgent,
      }));
    const other = userAgents
      .slice(USER_AGENT_COLORS.length)
      .reduce((sum, item) => sum + item.count, 0);
    if (other > 0) {
      top.push({
        key: "other",
        label: "Other",
        value: other,
        color: OTHER_COLOR,
        selectionValue: "other",
        filterValue: undefined,
      });
    }
    return top;
  }, [userAgents]);

  const agentConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        agentData.map((slice) => [
          slice.key,
          { label: slice.label, color: slice.color },
        ]),
      ),
    [agentData],
  );
  const userAgentTotal = userAgents.reduce((sum, item) => sum + item.count, 0);
  const selectedAgentBucket =
    userAgent === null
      ? null
      : agentData.some((slice) => slice.filterValue === userAgent)
        ? userAgent
        : "other";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DistributionCard
        title="Peer reachability"
        description="Latest crawler handshake snapshot"
        icon={<CircleCheck />}
        data={statusData}
        config={statusConfig}
        total={total}
        totalLabel="Peers"
        isLoading={isLoading}
        selected={status === "all" ? null : status}
        onSelect={(value) => {
          const next = value as PeerStatusFilter;
          onStatusChange(status === next ? "all" : next);
        }}
      />
      <DistributionCard
        title="User agents"
        description="Most common clients among available peers"
        icon={<Waypoints />}
        data={agentData}
        config={agentConfig}
        total={userAgentTotal}
        totalLabel="Reporting"
        isLoading={isLoading}
        selected={selectedAgentBucket}
        onSelect={(value) =>
          onUserAgentChange(userAgent === value ? null : value)
        }
      />
    </div>
  );
}

function DistributionCard({
  title,
  description,
  icon,
  data,
  config,
  total,
  totalLabel,
  isLoading,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  data: ChartSlice[];
  config: ChartConfig;
  total: number;
  totalLabel: string;
  isLoading: boolean;
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  const nonZero = data.filter((slice) => slice.value > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 text-accent [&_svg]:size-4">
            {icon}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-[224px] items-center">
        {isLoading ? (
          <div className="flex w-full items-center gap-6">
            <Skeleton className="size-40 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-7 w-3/5" />
            </div>
          </div>
        ) : total === 0 ? (
          <EmptyState title="No distribution data" className="w-full py-6" />
        ) : (
          <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative size-40 shrink-0 self-center">
              <ChartContainer
                config={config}
                className="aspect-square size-40 [&_.recharts-tooltip-wrapper]:z-10"
              >
                <PieChart title={`${title}: ${total.toLocaleString()} total`}>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="key" hideLabel />}
                  />
                  <Pie
                    data={nonZero}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={48}
                    outerRadius={74}
                    paddingAngle={2}
                    stroke="var(--background)"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={650}
                  >
                    {nonZero.map((slice) => {
                      const active = selected === slice.selectionValue;
                      const muted = selected !== null && !active;
                      return (
                        <Cell
                          key={slice.key}
                          fill={slice.color}
                          opacity={muted ? 0.35 : 1}
                          className={cn(slice.filterValue && "cursor-pointer")}
                          onClick={() =>
                            slice.filterValue && onSelect(slice.filterValue)
                          }
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display-num text-2xl tabular-nums">
                  {formatCompact(total)}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {totalLabel}
                </span>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {data.map((slice) => (
                <DistributionRow
                  key={slice.key}
                  slice={slice}
                  total={total}
                  selected={selected === slice.selectionValue}
                  dimmed={
                    selected !== null && selected !== slice.selectionValue
                  }
                  onSelect={
                    slice.filterValue
                      ? () => onSelect(slice.filterValue as string)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DistributionRow({
  slice,
  total,
  selected,
  dimmed,
  onSelect,
}: {
  slice: ChartSlice;
  total: number;
  selected: boolean;
  dimmed: boolean;
  onSelect?: () => void;
}) {
  const content = (
    <>
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: slice.color }}
      />
      <span className="min-w-0 flex-1 truncate text-left font-mono text-xs">
        {slice.label}
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums">
        {slice.value.toLocaleString()}
      </span>
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {((slice.value / total) * 100).toFixed(1)}%
      </span>
    </>
  );
  if (!onSelect) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5",
          dimmed && "opacity-45",
        )}
      >
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "bg-accent/10 text-accent",
        dimmed && "opacity-45",
      )}
    >
      {content}
    </button>
  );
}
