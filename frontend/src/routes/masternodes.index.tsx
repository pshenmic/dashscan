import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { CircleCheck, Server, ServerCrash } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { HashDisplay } from "@/components/hash-display";
import { MnStatusBadge, MnTypeBadge } from "@/components/status-badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import type { ApiMasternode } from "@/lib/api/types";
import { formatCompact, formatRelativeTime, getIp } from "@/lib/format";
import { paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";
import { cn } from "@/lib/utils";

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
    return { totalAll, banned, enabled, sampled: sample.length };
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
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            row.posPenaltyScore === 0 ? "text-success" : "text-destructive",
          )}
        >
          {row.posPenaltyScore}
        </span>
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
      <div className="flex flex-col gap-8">
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
