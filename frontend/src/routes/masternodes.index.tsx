import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { CircleCheck, Server, ServerCrash } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import { MnStatusBadge, MnTypeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import type { ApiMasternode } from "@/lib/api/types";
import {
  formatCompact,
  formatRelativeTime,
  getIp,
  getMnTypeLabel,
} from "@/lib/format";
import { paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";

const statusConfig: ChartConfig = {
  value: { label: "Nodes", color: "var(--chart-1)" },
};

const typeConfig: ChartConfig = {
  value: { label: "Nodes", color: "var(--chart-2)" },
};

export const Route = createFileRoute("/masternodes/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: MasternodesPage,
  head: () => ({ meta: [{ title: "Masternodes | DashScan" }] }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page, limit, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({
          network,
          page: 1,
          limit: 100,
          order: "desc",
        }),
      ),
    ]);
  },
});

function MasternodesPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [search, setSearch] = useState("");
  const statusGradId = useId();
  const typeGradId = useId();

  const { data, isFetching } = useQuery(
    masternodesQueryOptions({ network, page, limit, order: "desc" }),
  );

  const { data: statsData } = useQuery(
    masternodesQueryOptions({ network, page: 1, limit: 100, order: "desc" }),
  );

  const masternodes = data?.resultSet ?? [];
  const total = data?.pagination?.total ?? 0;

  const filtered = useMemo(() => {
    if (!search) return masternodes;
    const q = search.toLowerCase();
    return masternodes.filter(
      (m) =>
        m.proTxHash.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        m.payee?.toLowerCase().includes(q),
    );
  }, [search, masternodes]);

  const stats = useMemo(() => {
    const sample = statsData?.resultSet ?? [];
    const totalAll = statsData?.pagination?.total ?? null;
    const banned = sample.filter((n) =>
      n.status.toUpperCase().includes("BANNED"),
    ).length;
    const enabled = sample.filter(
      (n) => n.status.toUpperCase() === "ENABLED",
    ).length;
    const other = sample.length - banned - enabled;

    const typeCounts = sample.reduce<Record<string, number>>((acc, n) => {
      const key = getMnTypeLabel(n.type);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const typeChart = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      value: count,
    }));

    const statusChart = [
      { status: "Enabled", value: enabled },
      { status: "Banned", value: banned },
      ...(other > 0 ? [{ status: "Other", value: other }] : []),
    ];

    return {
      totalAll,
      banned,
      enabled,
      sampled: sample.length,
      typeChart,
      statusChart,
    };
  }, [statsData]);

  const columns: DataTableColumn<ApiMasternode>[] = [
    {
      id: "ip",
      header: "IP Address",
      cell: (row) => (
        <span className="inline-flex items-center gap-2 font-mono text-sm">
          <Server className="size-3.5 text-muted-foreground" />
          {getIp(row.address)}
        </span>
      ),
    },
    {
      id: "protx",
      header: "ProTx Hash",
      cell: (row) => (
        <HashDisplay
          value={row.proTxHash}
          href="/masternodes/$hash"
          params={{ hash: row.proTxHash }}
        />
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => <MnTypeBadge type={row.type} />,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <MnStatusBadge status={row.status} />,
    },
    {
      id: "pose",
      header: "PoSe Score",
      align: "right",
      cell: (row) => (
        <Badge
          variant={
            row.posPenaltyScore === 0 ? "soft-success" : "soft-destructive"
          }
          className="font-mono tabular-nums"
        >
          {row.posPenaltyScore}
        </Badge>
      ),
    },
    {
      id: "lastpaid",
      header: "Last Paid",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.lastPaidTime ? formatRelativeTime(row.lastPaidTime) : "Never"}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Masternodes
          </h1>
          <p className="text-sm text-muted-foreground">
            Active and banned masternodes securing the Dash network.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total Masternodes</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {stats.totalAll != null ? formatCompact(stats.totalAll) : "—"}
              </CardTitle>
              <CardAction>
                <Server className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Enabled (sampled)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {stats.sampled > 0 ? stats.enabled.toLocaleString() : "—"}
              </CardTitle>
              <CardAction>
                <CircleCheck className="size-4 text-success" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              In latest {stats.sampled} nodes
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Banned (sampled)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {stats.sampled > 0 ? stats.banned.toLocaleString() : "—"}
              </CardTitle>
              <CardAction>
                <ServerCrash className="size-4 text-destructive" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              In latest {stats.sampled} nodes
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>Status Distribution</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {stats.sampled} nodes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.statusChart.length > 0 ? (
                <ChartContainer
                  config={statusConfig}
                  className="aspect-auto h-[180px] w-full"
                >
                  <BarChart
                    data={stats.statusChart}
                    layout="vertical"
                    margin={{ left: 16, right: 16 }}
                  >
                    <defs>
                      <linearGradient
                        id={statusGradId}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--color-value)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-value)"
                          stopOpacity={0.4}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => Number(v).toFixed(0)}
                    />
                    <YAxis
                      type="category"
                      dataKey="status"
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="value"
                      fill={`url(#${statusGradId})`}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyState title="No data" className="h-[180px]" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Type Distribution</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {stats.typeChart.length}{" "}
                {stats.typeChart.length === 1 ? "type" : "types"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.typeChart.length > 0 ? (
                <ChartContainer
                  config={typeConfig}
                  className="aspect-auto h-[180px] w-full"
                >
                  <BarChart
                    data={stats.typeChart}
                    layout="vertical"
                    margin={{ left: 16, right: 16 }}
                  >
                    <defs>
                      <linearGradient
                        id={typeGradId}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--color-value)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-value)"
                          stopOpacity={0.4}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => Number(v).toFixed(0)}
                    />
                    <YAxis
                      type="category"
                      dataKey="type"
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="value"
                      fill={`url(#${typeGradId})`}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyState title="No data" className="h-[180px]" />
              )}
            </CardContent>
          </Card>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isFetching}
          rowKey={(row) => row.proTxHash}
          onRowClick={(node) =>
            navigate({
              to: "/masternodes/$hash",
              params: { hash: node.proTxHash },
            })
          }
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Filter visible page by IP or ProTx hash…",
          }}
          emptyTitle="No masternodes"
          pagination={{
            pageIndex: page,
            pageSize: limit,
            total,
            onPageChange: (p) => navigate({ search: { page: p, limit } }),
            onPageSizeChange: (size) =>
              navigate({
                // biome-ignore lint/suspicious/noExplicitAny: pagination size literal
                search: { page: 1, limit: size as any },
              }),
          }}
        />
      </div>
    </div>
  );
}
