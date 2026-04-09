import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Calendar, Percent, Server, ShieldBan } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DataTable } from "@/components/data-table";
import { HashCell } from "@/components/hash-cell";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import type { ApiMasternode } from "@/lib/api/types";
import {
  formatCompact,
  formatRelativeTime,
  getIp,
  getMnStatusBadgeStyle,
  getMnStatusLabel,
  getMnTypeBadgeStyle,
  getMnTypeLabel,
} from "@/lib/format";
import { getPageCount, paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/masternodes/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: MasternodesPage,
  head: () => ({
    meta: [{ title: "Masternodes | DashScan" }],
  }),
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

const columns: ColumnDef<ApiMasternode>[] = [
  {
    accessorKey: "address",
    header: "IP",
    cell: ({ row }) => {
      const ip = getIp(row.original.address);
      return (
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full border border-accent/12 text-accent">
            <Server className="size-3.5" />
          </div>
          <span className="font-mono font-medium">{ip}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "proTxHash",
    header: "ProTX Hash",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Link
          to="/masternodes/$hash"
          params={{ hash: row.original.proTxHash }}
          onClick={(e) => e.stopPropagation()}
        >
          <HashCell hash={row.original.proTxHash} />
        </Link>
        <CopyButton value={row.original.proTxHash} />
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ getValue }) => {
      const type = getValue<string>();
      return (
        <Badge className={`h-6 font-medium ${getMnTypeBadgeStyle(type)}`}>
          {getMnTypeLabel(type)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<string>();
      return (
        <Badge className={`h-6 font-medium ${getMnStatusBadgeStyle(status)}`}>
          {getMnStatusLabel(status)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "posPenaltyScore",
    header: "PoSe Score",
    cell: ({ getValue }) => {
      const score = getValue<number>();
      const isZero = score === 0;
      return (
        <span
          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold ${
            isZero ? "bg-[#4C7EFF1F] text-accent" : "bg-red-500/12 text-red-500"
          }`}
        >
          {score}
        </span>
      );
    },
  },
  {
    accessorKey: "lastPaidTime",
    header: "Last Paid",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {formatRelativeTime(getValue<number>())}
      </span>
    ),
  },
];

const skeletonWidths = ["w-28", "w-44", "w-20", "w-20", "w-14", "w-20"];

function MasternodesPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");

  const { data, isFetching } = useQuery(
    masternodesQueryOptions({ network, page, limit, order: "desc" }),
  );

  const { data: statsData } = useQuery(
    masternodesQueryOptions({ network, page: 1, limit: 100, order: "desc" }),
  );

  const masternodes = data?.resultSet ?? [];
  const pageCount = getPageCount(data?.pagination);

  const stats = useMemo(() => {
    const all = statsData?.resultSet ?? [];
    const total = statsData?.pagination?.total ?? null;
    const bannedCount = all.filter((n) =>
      n.status.toUpperCase().includes("BANNED"),
    ).length;
    const totalRewards = all.reduce((sum, n) => sum + n.consecutivePayments, 0);

    return { total, bannedCount, totalRewards };
  }, [statsData]);

  const table = useReactTable({
    data: masternodes,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount,
  });

  return (
    <main className="mx-auto max-w-[1440px] overflow-hidden px-6 py-10">
      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_2fr] [&>*]:min-w-0 animate-fade-in-up">
        <div className="grid gap-4 [&>*]:min-w-0">
          <StatCard
            icon={<Server className="size-[34px]" strokeWidth={1.5} />}
            label="Enabled Nodes"
            value={
              stats.total != null
                ? formatCompact(stats.total - stats.bannedCount)
                : "—"
            }
          />
          <StatCard
            icon={<ShieldBan className="size-[34px]" strokeWidth={1.5} />}
            label="Banned Nodes"
            value={`${stats.bannedCount} Min`}
          />
          <StatCard
            icon={<Percent className="size-[34px]" strokeWidth={1.5} />}
            label="Rewards"
            value={
              stats.totalRewards > 0 ? formatCompact(stats.totalRewards) : "—"
            }
          />
        </div>

        <Card className="relative overflow-hidden rounded-[24px] border bg-white">
          <div
            className="pointer-events-none absolute -inset-px bg-no-repeat"
            style={{
              backgroundImage:
                "url('/images/masternodes/masternodes-hero-bg.png')",
              backgroundPosition: "top right",
              backgroundSize: "cover",
            }}
          />
          <CardHeader className="relative px-5 pb-2 sm:px-6">
            <div>
              <p className="text-[15px] font-medium text-muted-foreground">
                Current Masternodes (Total)
              </p>
              <CardTitle className="mt-1 text-[34px] font-medium tracking-[-0.03em]">
                <span className="font-extrabold text-[#21314d]">
                  {stats.total != null ? stats.total.toLocaleString() : "—"}
                </span>{" "}
                <span className="text-muted-foreground">Nodes</span>
              </CardTitle>
            </div>
            <CardAction>
              <Badge
                variant="outline"
                className="h-7 gap-1.5 whitespace-nowrap rounded-full border-white/80 bg-white/8 px-2.5 text-[11px] font-medium text-white backdrop-blur-[2px]"
              >
                <Calendar className="size-3 shrink-0" />
                Compared to 24h
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="relative flex min-h-[200px] items-center justify-center px-3 pb-3 sm:px-4 sm:pb-4">
            <p className="text-sm text-muted-foreground">
              Historical data coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Masternodes
          </CardTitle>
          <CardAction>
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder="Search by IP or ProTX Hash..."
            />
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto px-3">
          <DataTable
            table={table}
            isFetching={isFetching}
            isEmpty={masternodes.length === 0}
            skeletonWidths={skeletonWidths}
            skeletonRows={limit}
            emptyMessage="No masternodes found."
            onRowClick={(node) =>
              navigate({
                to: "/masternodes/$hash",
                params: { hash: node.proTxHash },
              })
            }
          />
        </CardContent>
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={(p) => navigate({ search: { page: p, limit } })}
          pageSize={limit}
          onPageSizeChange={(size) =>
            navigate({ search: { page: 1, limit: size } })
          }
        />
      </Card>
    </main>
  );
}
