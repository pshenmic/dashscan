import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChartPie,
  ChevronDown,
  Server,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DataTable } from "@/components/data-table";
import { HashCell } from "@/components/hash-cell";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
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

function MnStatCard({
  icon,
  label,
  value,
  bgImage,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  bgImage: string;
}) {
  return (
    <Card className="relative h-[152px] gap-0 overflow-hidden rounded-[24px] border-0 bg-white p-5 shadow-none">
      <div
        className="pointer-events-none absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundPosition: "top right",
          backgroundSize: "cover",
        }}
        aria-hidden
      />
      <div className="relative flex size-12 shrink-0 self-start items-center justify-center rounded-full bg-accent/10 text-accent">
        {icon}
      </div>
      <div className="relative mt-3">
        <p className="text-[28px] font-extrabold tracking-[-0.02em] text-[#10213f]">
          {value}
        </p>
        <p className="mt-1 text-[14px] font-medium text-muted-foreground">
          {label}
        </p>
      </div>
    </Card>
  );
}

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

    return { total, bannedCount };
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
          <MnStatCard
            icon={<ChartPie className="size-5" strokeWidth={1.75} />}
            label="Enabled Nodes"
            value={
              stats.total != null
                ? formatCompact(stats.total - stats.bannedCount)
                : "—"
            }
            bgImage="/images/masternodes/enabled-nodes.png"
          />
          <MnStatCard
            icon={
              <img src="/icons/block-reward.svg" alt="" className="size-5" />
            }
            label="Banned Nodes"
            value={formatCompact(stats.bannedCount)}
            bgImage="/images/masternodes/banned-nodes.png"
          />
        </div>

        <Card className="relative overflow-hidden rounded-[24px] border-0 bg-white shadow-none">
          <CardHeader className="relative px-5 pb-2 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Wallet className="size-5" strokeWidth={1.75} />
              </div>
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
            </div>
            <CardAction>
              <div className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-[#EAF0FF] px-1.5 text-[12px] font-medium">
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white px-2 text-accent">
                  <span className="font-semibold">3</span>
                  <TrendingUp className="size-3" strokeWidth={2.75} />
                  <span className="font-semibold">2.5%</span>
                </span>
                <span className="text-muted-foreground">Compared to</span>
                <button
                  type="button"
                  className="inline-flex h-6 items-center gap-1 rounded-full bg-white px-2 text-[12px] font-medium text-foreground"
                >
                  24h
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="relative flex min-h-[200px] items-center justify-center px-3 pb-3 sm:px-4 sm:pb-4">
            <p className="text-sm text-muted-foreground">
              Historical data coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      <Card
        className="border-0 shadow-none animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
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
            borderless
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
