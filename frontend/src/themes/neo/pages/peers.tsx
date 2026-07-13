import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { CircleCheck, Network, Server, ServerCrash } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type ApiPeer,
  allPeersQueryOptions,
  peersQueryOptions,
} from "@/lib/api/peers";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { appStore } from "@/lib/store";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import {
  countryFlagEmoji,
  countryName,
} from "@/themes/neo/components/masternode-map/iso-codes";
import { PeersMap } from "@/themes/neo/components/peers-map";
import { Badge } from "@/themes/neo/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";

const PAGINATION_PAGE_SIZE = 10;

const columns: DataTableColumn<ApiPeer>[] = [
  {
    id: "peer",
    header: "Peer",
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-base leading-none" aria-hidden="true">
          {row.geo ? countryFlagEmoji(row.geo.countryCode) : "🌐"}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 font-mono text-sm font-medium">
            <Server className="size-3.5 text-muted-foreground" />
            {row.address}
          </span>
          {row.geo && (
            <span className="truncate text-[11px] text-muted-foreground">
              {[row.geo.city, countryName(row.geo.countryCode)]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </div>
      </div>
    ),
    width: 360,
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant={row.available ? "soft-success" : "soft-destructive"}>
        {row.available ? (
          <CircleCheck className="size-3" />
        ) : (
          <ServerCrash className="size-3" />
        )}
        {row.available ? "Available" : "Unavailable"}
      </Badge>
    ),
  },
  {
    id: "agent",
    header: "User Agent",
    cell: (row) => (
      <span className="truncate font-mono text-xs text-muted-foreground">
        {row.userAgent || "—"}
      </span>
    ),
    width: 220,
  },
  {
    id: "version",
    header: "Version",
    align: "right",
    cell: (row) => (
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {row.protocolVersion ?? "—"}
      </span>
    ),
  },
  {
    id: "lastseen",
    header: "Last Seen",
    align: "right",
    cell: (row) => (
      <span className="whitespace-nowrap text-sm text-muted-foreground">
        {row.lastSeen ? formatRelativeTime(row.lastSeen) : "—"}
      </span>
    ),
  },
];

export default function RedesignPeersListPage() {
  const network = useStore(appStore, (state) => state.network);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION_PAGE_SIZE);
  const [country, setCountry] = useState<string | null>(null);

  const { data: pagedData, isFetching } = useQuery(
    peersQueryOptions({ network, page, limit: pageSize, order: "desc" }),
  );

  const { data: allPeers } = useQuery(allPeersQueryOptions({ network }));

  const peers = pagedData?.resultSet ?? [];
  const total = pagedData?.pagination?.total ?? 0;

  const stats = useMemo(() => {
    const all = allPeers ?? [];
    const available = all.filter((p) => p.available).length;
    return {
      total: all.length,
      available,
      unavailable: all.length - available,
    };
  }, [allPeers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return peers.filter((p) => {
      if (q) {
        const match =
          p.address.toLowerCase().includes(q) ||
          p.userAgent?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (country && p.geo?.countryCode !== country) return false;
      return true;
    });
  }, [search, peers, country]);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Peers
          </h1>
          <p className="text-sm text-muted-foreground">
            Peer-to-peer nodes discovered by the network crawler.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total Peers</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {stats.total > 0 ? formatCompact(stats.total) : "—"}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Network className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {stats.total > 0 ? stats.available.toLocaleString() : "—"}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-success/12 [&_svg]:text-success">
                  <CircleCheck className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Unavailable</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {stats.total > 0 ? stats.unavailable.toLocaleString() : "—"}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-destructive/12 [&_svg]:text-destructive">
                  <ServerCrash className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
        </div>

        <PeersMap
          variant="page"
          selectedCountry={country}
          onSelectCountry={setCountry}
        />

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isFetching && peers.length === 0}
          rowKey={(row) => row.address}
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Filter visible page by address or user agent…",
          }}
          emptyTitle="No peers"
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
