import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Boxes, Clock, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { HashDisplay } from "@/components/hash-display";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { blocksQueryOptions } from "@/lib/api/blocks";
import type { ApiBlock } from "@/lib/api/types";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { paginationSearchSchema } from "@/lib/pagination";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/blocks/")({
  validateSearch: paginationSearchSchema,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  component: BlocksPage,
  head: () => ({ meta: [{ title: "Blocks | DashScan" }] }),
  loader: ({ context, deps: { page, limit } }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page, limit, order: "desc" }),
      ),
    ]);
  },
});

function BlocksPage() {
  const network = useStore(appStore, (state) => state.network);
  const { page, limit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [search, setSearch] = useState("");

  const { data, isFetching } = useQuery(
    blocksQueryOptions({ network, page, limit, order: "desc" }),
  );

  const blocks = data?.resultSet ?? [];
  const total = data?.pagination?.total ?? 0;

  const filtered = useMemo(() => {
    if (!search) return blocks;
    const q = search.toLowerCase();
    return blocks.filter(
      (b) => b.hash.toLowerCase().includes(q) || String(b.height).includes(q),
    );
  }, [search, blocks]);

  const stats = useMemo(() => {
    const latestHeight = blocks.length > 0 ? blocks[0].height : null;
    let avgBlockTime: number | null = null;
    if (blocks.length >= 2) {
      const times = blocks.map((b) => new Date(b.timestamp).getTime());
      const diffs: number[] = [];
      for (let i = 0; i < times.length - 1; i++) {
        diffs.push(Math.abs(times[i] - times[i + 1]));
      }
      avgBlockTime = diffs.reduce((s, d) => s + d, 0) / diffs.length / 1000;
    }
    return { latestHeight, avgBlockTime };
  }, [blocks]);

  const columns: DataTableColumn<ApiBlock>[] = [
    {
      id: "height",
      header: "Height",
      cell: (row) => (
        <span className="font-mono text-sm font-medium tabular-nums">
          #{row.height.toLocaleString()}
        </span>
      ),
      width: 140,
    },
    {
      id: "hash",
      header: "Block Hash",
      cell: (row) => (
        <HashDisplay
          value={row.hash}
          href="/blocks/$hashOrHeight"
          params={{ hashOrHeight: row.hash }}
        />
      ),
    },
    {
      id: "txs",
      header: "Txs",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums">{row.txCount}</span>
      ),
    },
    {
      id: "size",
      header: "Size",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {(row.size / 1024).toFixed(2)} KB
        </span>
      ),
    },
    {
      id: "difficulty",
      header: "Difficulty",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {row.difficulty.toFixed(4)}
        </span>
      ),
    },
    {
      id: "time",
      header: "Age",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatRelativeTime(row.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Blocks"
          subtitle="Latest blocks on the Dash network."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Latest Block"
            value={
              stats.latestHeight != null
                ? `#${stats.latestHeight.toLocaleString()}`
                : "—"
            }
            icon={<Layers />}
          />
          <KpiCard
            label="Avg Block Time"
            value={
              stats.avgBlockTime != null
                ? `${stats.avgBlockTime.toFixed(0)}s`
                : "—"
            }
            icon={<Clock />}
            hint={`Across the latest ${blocks.length} blocks`}
          />
          <KpiCard
            label="Total Blocks"
            value={total > 0 ? formatCompact(total) : "—"}
            icon={<Boxes />}
          />
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isFetching}
          rowKey={(row) => row.hash}
          onRowClick={(block) =>
            navigate({
              to: "/blocks/$hashOrHeight",
              params: { hashOrHeight: block.hash },
            })
          }
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Filter visible page by hash or height…",
          }}
          emptyTitle="No blocks"
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
