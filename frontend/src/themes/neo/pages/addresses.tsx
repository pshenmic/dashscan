import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Activity, Info, Trophy, Users } from "lucide-react";
import { useMemo } from "react";
import { DashIcon } from "@/components/dash-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  addressesActivityInfiniteQueryOptions,
  addressesActivityQueryOptions,
  richListInfiniteQueryOptions,
  richListQueryOptions,
} from "@/lib/api/addresses";
import { priceQueryOptions } from "@/lib/api/price";
import type {
  ApiAddressActivityEntry,
  ApiAddressBalanceEntry,
} from "@/lib/api/types";
import { DUFFS_PER_DASH, formatCompact, formatCompactUsd } from "@/lib/format";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import { EmptyState } from "@/themes/neo/components/empty-state";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { Badge } from "@/themes/neo/components/ui/badge";

const PAGE_SIZE = 25;

type ActivityWindow = "24h" | "3d" | "7d" | "30d";

const WINDOW_OPTIONS: { value: ActivityWindow; label: string }[] = [
  { value: "24h", label: "24H" },
  { value: "3d", label: "3D" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

const WINDOW_MS: Record<ActivityWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function RankBadge({ rank }: { rank: number }) {
  return (
    <Badge
      variant={rank <= 3 ? "soft-accent" : "soft"}
      className="min-w-9 justify-center font-mono tabular-nums"
    >
      #{rank}
    </Badge>
  );
}

function ActivityBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex h-2 w-full max-w-44 overflow-hidden rounded-full bg-secondary">
      <div
        className="rounded-full bg-accent/70 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function RedesignAddressesPage() {
  const network = useStore(appStore, (state) => state.network);
  const navigate = useNavigate({ from: "/addresses" });
  const search = useSearch({ from: "/addresses" });

  const tab = search.tab ?? "active";
  const activityWindow = search.window ?? "24h";
  const page = search.page ?? 1;

  const setSearch = (
    patch: Partial<{
      tab: "active" | "rich";
      window: ActivityWindow;
      page: number;
    }>,
  ) => {
    navigate({
      search: (prev) => ({ ...prev, ...patch }),
      resetScroll: false,
    });
  };

  const windowBounds = useMemo(() => {
    const end = new Date();
    end.setSeconds(0, 0);
    const start = new Date(end.getTime() - WINDOW_MS[activityWindow]);
    return {
      timestampStart: start.toISOString(),
      timestampEnd: end.toISOString(),
    };
  }, [activityWindow]);

  const [viewMode, setViewMode] = useTableViewMode("addresses");
  const isInfinite = viewMode === "infinite";

  const {
    data: activityInfinite,
    isFetching: isActivityInfiniteFetching,
    isFetchingNextPage: isActivityFetchingNextPage,
    hasNextPage: activityHasNextPage,
    fetchNextPage: fetchNextActivityPage,
  } = useInfiniteQuery({
    ...addressesActivityInfiniteQueryOptions({
      network,
      limit: PAGE_SIZE,
      order: "desc",
      ...windowBounds,
    }),
    enabled: tab === "active" && isInfinite,
  });

  const { data: activityPaged, isFetching: isActivityPagedFetching } = useQuery(
    {
      ...addressesActivityQueryOptions({
        network,
        page,
        limit: PAGE_SIZE,
        order: "desc",
        ...windowBounds,
      }),
      enabled: tab === "active" && !isInfinite,
    },
  );

  const {
    data: richInfinite,
    isFetching: isRichInfiniteFetching,
    isFetchingNextPage: isRichFetchingNextPage,
    hasNextPage: richHasNextPage,
    fetchNextPage: fetchNextRichPage,
  } = useInfiniteQuery({
    ...richListInfiniteQueryOptions({
      network,
      limit: PAGE_SIZE,
      order: "desc",
    }),
    enabled: tab === "rich" && isInfinite,
  });

  const { data: richPaged, isFetching: isRichPagedFetching } = useQuery({
    ...richListQueryOptions({
      network,
      page,
      limit: PAGE_SIZE,
      order: "desc",
    }),
    enabled: tab === "rich" && !isInfinite,
  });

  const { data: usdPrice } = useQuery(
    priceQueryOptions({ network, currency: "usd" }),
  );

  const activityRows = useMemo(
    () =>
      isInfinite
        ? (activityInfinite?.pages ?? [])
            .filter((p) => p != null)
            .flatMap((p) => p.resultSet)
        : (activityPaged?.resultSet ?? []),
    [isInfinite, activityInfinite, activityPaged],
  );
  const activityTotal = isInfinite
    ? (activityInfinite?.pages?.find((p) => p != null)?.pagination?.total ?? 0)
    : (activityPaged?.pagination?.total ?? 0);
  const isActivityFetching = isInfinite
    ? isActivityInfiniteFetching
    : isActivityPagedFetching;
  const maxTxCount = activityRows.reduce(
    (max, row) => Math.max(max, Number(row.txCount ?? 0)),
    0,
  );
  const isLongWindow = activityWindow === "7d" || activityWindow === "30d";
  const activityUnavailable = isInfinite
    ? activityInfinite?.pages?.[0] === null
    : activityPaged === null;

  const richRows = useMemo(
    () =>
      (isInfinite
        ? (richInfinite?.pages ?? []).flatMap((p) => p.resultSet)
        : (richPaged?.resultSet ?? [])
      ).filter((row) => row.address !== "others"),
    [isInfinite, richInfinite, richPaged],
  );
  const richTotal = isInfinite
    ? (richInfinite?.pages?.[0]?.pagination?.total ?? 0)
    : (richPaged?.pagination?.total ?? 0);
  const isRichFetching = isInfinite
    ? isRichInfiniteFetching
    : isRichPagedFetching;

  const rankOffset = isInfinite ? 0 : (page - 1) * PAGE_SIZE;

  const activityColumns: DataTableColumn<ApiAddressActivityEntry>[] = [
    {
      id: "rank",
      width: 64,
      header: "#",
      cell: (_, index) => <RankBadge rank={rankOffset + index + 1} />,
    },
    {
      id: "address",
      header: "Address",
      cell: (row) =>
        row.address ? (
          <HashDisplay
            value={row.address}
            href="/address/$address"
            params={{ address: row.address }}
            head={12}
            tail={8}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "share",
      header: "Activity",
      cell: (row) => (
        <ActivityBar value={Number(row.txCount ?? 0)} max={maxTxCount} />
      ),
    },
    {
      id: "txCount",
      align: "right",
      header: "Transactions",
      cell: (row) => (
        <span className="font-mono text-sm font-medium tabular-nums text-accent">
          {Number(row.txCount ?? 0).toLocaleString()}
        </span>
      ),
    },
  ];

  const richColumns: DataTableColumn<ApiAddressBalanceEntry>[] = [
    {
      id: "rank",
      width: 64,
      header: "#",
      cell: (_, index) => <RankBadge rank={rankOffset + index + 1} />,
    },
    {
      id: "address",
      header: "Address",
      cell: (row) =>
        row.address ? (
          <HashDisplay
            value={row.address}
            href="/address/$address"
            params={{ address: row.address }}
            head={12}
            tail={8}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "concentration",
      header: "Concentration",
      cell: (row) => {
        const concentration =
          row.concentration != null ? Number(row.concentration) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-2 w-full max-w-32 overflow-hidden rounded-full bg-secondary">
              <div
                className="rounded-full bg-accent/70"
                style={{ width: `${Math.min(100, concentration)}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {concentration < 0.01
                ? `${concentration.toFixed(4)}%`
                : `${concentration.toFixed(2)}%`}
            </span>
          </div>
        );
      },
    },
    {
      id: "balance",
      align: "right",
      header: "Balance",
      cell: (row) => {
        const balanceDash =
          row.balance != null ? Number(row.balance) / DUFFS_PER_DASH : 0;
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-sm font-medium tabular-nums text-accent">
              {formatCompact(balanceDash)} <DashIcon />
            </span>
            <span className="text-xs text-muted-foreground">
              {usdPrice?.usd != null
                ? `≈ ${formatCompactUsd(balanceDash * usdPrice.usd)}`
                : ""}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Addresses
          </h1>
          <p className="text-sm text-muted-foreground">
            Most active addresses and the largest holders on the network.
          </p>
        </header>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (value === "active" || value === "rich") {
              setSearch({ tab: value, page: 1 });
            }
          }}
          className="gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="active" className="gap-1.5">
                <Activity className="size-3.5" /> Most active
              </TabsTrigger>
              <TabsTrigger value="rich" className="gap-1.5">
                <Trophy className="size-3.5" /> Rich list
              </TabsTrigger>
            </TabsList>
            {tab === "active" && (
              <ToggleGroup
                type="single"
                size="sm"
                value={activityWindow}
                onValueChange={(value) => {
                  if (value) {
                    setSearch({ window: value as ActivityWindow, page: 1 });
                  }
                }}
                aria-label="Activity window"
              >
                {WINDOW_OPTIONS.map((opt) => (
                  <ToggleGroupItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </div>

          <TabsContent value="active" className="flex flex-col gap-3">
            {activityUnavailable ? (
              <EmptyState
                title="Activity ranking unavailable"
                description="This network's API doesn't expose address activity yet. Check back soon."
                icon={<Activity className="size-6" />}
              />
            ) : (
              <>
                <DataTable
                  columns={activityColumns}
                  data={activityRows}
                  isLoading={isActivityFetching && activityRows.length === 0}
                  rowKey={(row, idx) => row.address ?? `activity-${idx}`}
                  emptyTitle="No activity found"
                  emptyDescription="No address activity was recorded in the selected window."
                  emptyIcon={<Users className="size-6" />}
                  viewMode={{ value: viewMode, onChange: setViewMode }}
                  infiniteScroll={{
                    hasNextPage: activityHasNextPage,
                    isFetchingNextPage: isActivityFetchingNextPage,
                    onLoadMore: () => fetchNextActivityPage(),
                    total: activityTotal,
                    loaded: activityRows.length,
                    skeletonRows: 5,
                  }}
                  pagination={{
                    pageIndex: page,
                    pageSize: PAGE_SIZE,
                    total: activityTotal,
                    onPageChange: (next) => setSearch({ page: next }),
                  }}
                />
                {isLongWindow && (
                  <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Long ranges are served from daily and weekly rollups, so
                    addresses with only a few transactions may be omitted and
                    the total is the size of the ranked set.
                  </p>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="rich">
            <DataTable
              columns={richColumns}
              data={richRows}
              isLoading={isRichFetching && richRows.length === 0}
              rowKey={(row, idx) => row.address ?? `rich-${idx}`}
              emptyTitle="No addresses found"
              emptyIcon={<Trophy className="size-6" />}
              viewMode={{ value: viewMode, onChange: setViewMode }}
              infiniteScroll={{
                hasNextPage: richHasNextPage,
                isFetchingNextPage: isRichFetchingNextPage,
                onLoadMore: () => fetchNextRichPage(),
                total: richTotal,
                loaded: richRows.length,
                skeletonRows: 5,
              }}
              pagination={{
                pageIndex: page,
                pageSize: PAGE_SIZE,
                total: richTotal,
                onPageChange: (next) => setSearch({ page: next }),
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
