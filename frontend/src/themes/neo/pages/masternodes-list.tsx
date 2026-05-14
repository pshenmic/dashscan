import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import { CircleCheck, Server, ServerCrash, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { DashIcon } from "@/components/dash-icon";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  allMasternodesGeoQueryOptions,
  masternodesInfiniteQueryOptions,
  masternodesQueryOptions,
} from "@/lib/api/masternodes";
import type { ApiMasternode } from "@/lib/api/types";
import {
  formatCompact,
  formatRelativeTime,
  getIp,
  getMnStatusBucket,
  getMnTypeBucket,
  getMnTypeLabel,
} from "@/lib/format";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { cn } from "@/lib/utils";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import { EmptyState } from "@/themes/neo/components/empty-state";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { MasternodeMap } from "@/themes/neo/components/masternode-map";
import {
  EMPTY_FILTERS,
  isFiltersActive,
  LAST_PAID_WINDOW_SEC,
  type MasternodeFilters,
  MasternodesFilterBar,
} from "@/themes/neo/components/masternodes-filter-bar";
import {
  MnStatusBadge,
  MnTypeBadge,
} from "@/themes/neo/components/status-badge";
import { Badge } from "@/themes/neo/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";

const INFINITE_PAGE_SIZE = 25;
const PAGINATION_PAGE_SIZE = 25;

const statusConfig: ChartConfig = {
  value: { label: "Nodes" },
  Enabled: { label: "Enabled", color: "var(--success)" },
  Banned: { label: "Banned", color: "var(--destructive)" },
  Other: { label: "Other", color: "var(--muted-foreground)" },
};

const TYPE_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-3)",
];

function buildTypeConfig(typeChart: { name: string; value: number }[]) {
  const config: ChartConfig = {
    value: { label: "Nodes" },
  };
  typeChart.forEach((entry, idx) => {
    config[entry.name] = {
      label: entry.name,
      color: TYPE_PALETTE[idx % TYPE_PALETTE.length],
    };
  });
  return config;
}

export default function RedesignMasternodesListPage() {
  const network = useStore(appStore, (state) => state.network);
  const navigate = useNavigate({ from: "/masternodes/" });
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useTableViewMode("masternodes");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE);
  const isInfinite = viewMode === "infinite";

  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...masternodesInfiniteQueryOptions({
        network,
        limit: INFINITE_PAGE_SIZE,
        order: "desc",
      }),
      enabled: isInfinite,
    });

  const { data: pagedData, isFetching: isPagedFetching } = useQuery({
    ...masternodesQueryOptions({
      network,
      page,
      limit: pageSize,
      order: "desc",
    }),
    enabled: !isInfinite,
  });

  const { data: statsData } = useQuery(
    masternodesQueryOptions({ network, page: 1, limit: 100, order: "desc" }),
  );

  const { data: geoData } = useQuery(
    allMasternodesGeoQueryOptions({ network }),
  );
  const [filters, setFilters] = useState<MasternodeFilters>(EMPTY_FILTERS);
  const filtersActive = isFiltersActive(filters);

  const countryByHash = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of geoData ?? []) m.set(p.proTxHash, p.countryCode);
    return m;
  }, [geoData]);

  const countryOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of geoData ?? []) {
      m.set(p.countryCode, (m.get(p.countryCode) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([code, count]) => ({ code, count }));
  }, [geoData]);

  const setSelectedCountry = useCallback(
    (code: string | null) => setFilters((f) => ({ ...f, country: code })),
    [],
  );

  useEffect(() => {
    if (filtersActive && !isInfinite) setViewMode("infinite");
  }, [filtersActive, isInfinite, setViewMode]);

  useEffect(() => {
    if (!filtersActive) return;
    if (isFetchingNextPage) return;
    if (hasNextPage) fetchNextPage();
  }, [filtersActive, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const infiniteMasternodes = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.resultSet) ?? [];
    const seen = new Set<string>();
    const unique: typeof all = [];
    for (const m of all) {
      if (seen.has(m.proTxHash)) continue;
      seen.add(m.proTxHash);
      unique.push(m);
    }
    return unique;
  }, [data]);
  const masternodes = isInfinite
    ? infiniteMasternodes
    : (pagedData?.resultSet ?? []);
  const total = isInfinite
    ? (data?.pages[0]?.pagination?.total ?? 0)
    : (pagedData?.pagination?.total ?? 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const nowSec = Math.floor(Date.now() / 1000);
    return masternodes.filter((m) => {
      if (q) {
        const match =
          m.proTxHash.toLowerCase().includes(q) ||
          m.address.toLowerCase().includes(q) ||
          m.payee?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.country) {
        const cc = countryByHash.get(m.proTxHash);
        if (cc !== filters.country) return false;
      }
      if (
        filters.statuses.length > 0 &&
        !filters.statuses.includes(getMnStatusBucket(m.status))
      )
        return false;
      if (
        filters.types.length > 0 &&
        !filters.types.includes(getMnTypeBucket(m.type))
      )
        return false;
      if (filters.lastPaid !== "any") {
        const lp = Number(m.lastPaidTime ?? 0);
        const windowSec = LAST_PAID_WINDOW_SEC[filters.lastPaid];
        if (windowSec === 0) {
          if (lp > 0) return false;
        } else if (windowSec != null) {
          if (lp <= 0) return false;
          if (nowSec - lp > windowSec) return false;
        }
      }
      if (filters.pose !== "any") {
        if (filters.pose === "healthy" && m.posPenaltyScore !== 0) return false;
        if (filters.pose === "penalty" && m.posPenaltyScore === 0) return false;
      }
      return true;
    });
  }, [search, masternodes, filters, countryByHash]);

  const typeConfig = useMemo(
    () =>
      buildTypeConfig(
        Object.entries(
          (statsData?.resultSet ?? []).reduce<Record<string, number>>(
            (acc, n) => {
              const key = getMnTypeLabel(n.type);
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            },
            {},
          ),
        ).map(([name, value]) => ({ name, value })),
      ),
    [statsData],
  );

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
    const typeChart = Object.entries(typeCounts).map(([name, count]) => ({
      name,
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
      id: "node",
      header: "Node",
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar username={row.proTxHash} className="size-9 shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-sm font-medium">
              <Server className="size-3.5 text-muted-foreground" />
              {getIp(row.address)}
            </span>
            <HashDisplay
              value={row.proTxHash}
              href="/masternodes/$hash"
              params={{ hash: row.proTxHash }}
              copy={false}
            />
          </div>
        </div>
      ),
      width: 360,
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
      header: "PoSe",
      align: "right",
      cell: (row) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={
                row.posPenaltyScore === 0 ? "soft-success" : "soft-destructive"
              }
              className={cn(
                "font-mono tabular-nums",
                row.posPenaltyScore === 0 && "[&_svg]:hidden",
              )}
            >
              <ShieldAlert className="size-3" />
              {row.posPenaltyScore}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>PoSe penalty score</TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: "stake",
      header: "Stake",
      align: "right",
      cell: (row) => {
        const stake = getMasternodeCollateral(row.type);
        return (
          <span className="font-mono text-sm font-medium tabular-nums text-accent">
            {stake.toLocaleString()} <DashIcon />
          </span>
        );
      },
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

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Total Masternodes</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-accent">
                  {stats.totalAll != null ? formatCompact(stats.totalAll) : "—"}
                </CardTitle>
                <CardAction>
                  <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                    <Server className="size-4" />
                  </div>
                </CardAction>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Enabled (sampled)</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-accent">
                  {stats.sampled > 0 ? stats.enabled.toLocaleString() : "—"}
                </CardTitle>
                <CardAction>
                  <div className="flex size-9 items-center justify-center rounded-full bg-success/12 [&_svg]:text-success">
                    <CircleCheck className="size-4" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                In latest {stats.sampled} nodes
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Banned (sampled)</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-accent">
                  {stats.sampled > 0 ? stats.banned.toLocaleString() : "—"}
                </CardTitle>
                <CardAction>
                  <div className="flex size-9 items-center justify-center rounded-full bg-destructive/12 [&_svg]:text-destructive">
                    <ServerCrash className="size-4" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                In latest {stats.sampled} nodes
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardDescription>Distribution</CardDescription>
              <CardTitle className="text-xl tabular-nums text-accent">
                {stats.sampled} nodes sampled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    By Status
                  </span>
                  {stats.statusChart.length > 0 ? (
                    <ChartContainer
                      config={statusConfig}
                      className="mx-auto aspect-square h-[200px]"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent nameKey="status" hideLabel />
                          }
                        />
                        <Pie
                          data={stats.statusChart}
                          dataKey="value"
                          nameKey="status"
                          innerRadius={42}
                          outerRadius={76}
                          strokeWidth={2}
                          paddingAngle={2}
                        >
                          {stats.statusChart.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={`var(--color-${entry.status})`}
                            />
                          ))}
                        </Pie>
                        <ChartLegend
                          content={<ChartLegendContent nameKey="status" />}
                        />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState title="No data" className="h-[200px] w-full" />
                  )}
                </div>

                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    By Type
                  </span>
                  {stats.typeChart.length > 0 ? (
                    <ChartContainer
                      config={typeConfig}
                      className="mx-auto aspect-square h-[200px]"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent nameKey="name" hideLabel />
                          }
                        />
                        <Pie
                          data={stats.typeChart}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={42}
                          outerRadius={76}
                          strokeWidth={2}
                          paddingAngle={2}
                        >
                          {stats.typeChart.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={`var(--color-${entry.name})`}
                            />
                          ))}
                        </Pie>
                        <ChartLegend
                          content={<ChartLegendContent nameKey="name" />}
                        />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState title="No data" className="h-[200px] w-full" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <MasternodeMap
          variant="page"
          selectedCountry={filters.country}
          onSelectCountry={setSelectedCountry}
        />

        <MasternodesFilterBar
          filters={filters}
          onChange={setFilters}
          countryOptions={countryOptions}
        />

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={
            (isInfinite ? isFetching : isPagedFetching) &&
            masternodes.length === 0
          }
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
            placeholder: isInfinite
              ? "Filter loaded masternodes by IP or ProTx hash…"
              : "Filter visible page by IP or ProTx hash…",
          }}
          emptyTitle="No masternodes"
          viewMode={{ value: viewMode, onChange: setViewMode }}
          infiniteScroll={{
            hasNextPage,
            isFetchingNextPage,
            onLoadMore: () => fetchNextPage(),
            total,
            loaded: masternodes.length,
            skeletonRows: 5,
          }}
          pagination={{
            pageIndex: page,
            pageSize,
            total,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </div>
    </div>
  );
}

function getMasternodeCollateral(type: string): number {
  const t = type.toLowerCase();
  if (t === "evo" || t === "evolution" || t === "highperformance") return 4000;
  return 1000;
}
