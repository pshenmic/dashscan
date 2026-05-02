import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Calendar, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DataTable } from "@/components/data-table";
import { HashCell } from "@/components/hash-cell";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { SuperblockFundingChart } from "@/components/superblock-funding-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { blocksQueryOptions } from "@/lib/api/blocks";
import {
  budgetQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import type { ApiGovernanceObject } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/format";
import {
  getDaysUntilSuperblock,
  getRequiredVotes,
  getVotingDeadline,
} from "@/lib/governance";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/dao")({
  component: DaoPage,
  head: () => ({
    meta: [{ title: "DAO | DashScan" }],
  }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        proposalsQueryOptions({ network, proposalType: "all" }),
      ),
      context.queryClient.prefetchQuery(budgetQueryOptions({ network })),
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page: 1, limit: 1 }),
      ),
    ]);
  },
});

const columns: ColumnDef<ApiGovernanceObject>[] = [
  {
    accessorKey: "creationTime",
    header: "Creation Time",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {getValue<string | null>()
          ? formatRelativeTime(getValue<string>())
          : "—"}
      </span>
    ),
  },
  {
    id: "name",
    header: "Proposal Name",
    accessorFn: (row) => row.data?.name ?? "",
    cell: ({ row }) => {
      const name = row.original.data?.name;
      const url = row.original.data?.url;
      if (!name) return <span className="text-muted-foreground">—</span>;
      if (url) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </a>
        );
      }
      return <span className="font-medium">{name}</span>;
    },
  },
  {
    id: "paymentAddress",
    header: "Payment Address",
    accessorFn: (row) => row.data?.paymentAddress ?? "",
    cell: ({ row }) => {
      const addr = row.original.data?.paymentAddress;
      if (!addr) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex items-center gap-1.5">
          <HashCell hash={addr} />
          <CopyButton value={addr} />
        </div>
      );
    },
  },
  {
    id: "votes",
    header: "Votes",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <Badge className="h-6 gap-1 border-[#3EBF5A]/24 bg-[#3EBF5A]/12 text-[#3EBF5A]">
          <ChevronUp className="size-3 opacity-64" />
          {row.original.yesCount ?? 0}
        </Badge>
        <Badge className="h-6 gap-1 border-[#FF4C4C]/24 bg-[#FF4C4C]/12 text-[#FF4C4C]">
          <ChevronDown className="size-3 opacity-64" />
          {row.original.noCount ?? 0}
        </Badge>
        <Badge className="h-6 gap-1 border-[#FFA04C]/24 bg-[#FFA04C]/12 text-[#FFA04C]">
          <Minus className="size-3 opacity-64" />
          {row.original.abstainCount ?? 0}
        </Badge>
      </div>
    ),
  },
  {
    id: "funding",
    header: "Funding",
    accessorFn: (row) => row.data?.paymentAmount ?? 0,
    cell: ({ row }) => {
      const amount = row.original.data?.paymentAmount;
      if (amount == null)
        return <span className="text-muted-foreground">—</span>;
      return (
        <Badge className="h-6 gap-1 border-0 bg-accent/12 font-medium text-accent">
          {amount.toLocaleString()}
          <img src="/icons/dash.svg" alt="" className="size-3.5" />
        </Badge>
      );
    },
  },
];

const skeletonWidths = ["w-20", "w-40", "w-36", "w-36", "w-20"];

function DaoPage() {
  const network = useStore(appStore, (state) => state.network);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const { data: allProposals, isFetching } = useQuery(
    proposalsQueryOptions({ network, proposalType: "all" }),
  );

  const { data: budget } = useQuery(budgetQueryOptions({ network }));

  const { data: blockData } = useQuery(
    blocksQueryOptions({ network, page: 1, limit: 1, order: "desc" }),
  );

  const { data: mnData } = useQuery(
    masternodesQueryOptions({ network, page: 1, limit: 1 }),
  );

  const proposals = useMemo(
    () =>
      (allProposals ?? []).filter(
        (p) => p.objectType === "Proposal" && p.data !== null,
      ),
    [allProposals],
  );

  const currentHeight = blockData?.resultSet?.[0]?.height ?? 0;
  const masternodeCount = mnData?.pagination?.total ?? 0;

  const availableBudget = budget?.totalBudget ?? 0;
  const proposalCount = budget?.totalProposals ?? proposals.length;
  const fundedAmount = budget?.enoughFundsTotal ?? 0;
  const fundedProposalCount = budget?.enoughFundsCount ?? 0;
  const remainingBudget = Math.max(0, availableBudget - fundedAmount);
  const totalRequested = budget?.totalRequested ?? 0;
  const unfundedAmount = Math.max(0, totalRequested - fundedAmount);
  const unfundedProposalCount = Math.max(
    0,
    proposalCount - fundedProposalCount,
  );
  const requiredVotes = getRequiredVotes(masternodeCount);
  const nextPaymentDays = getDaysUntilSuperblock(currentHeight);
  const votingDeadline = getVotingDeadline(currentHeight);

  const chartData = useMemo(() => {
    const triggers = (allProposals ?? []).filter(
      (p) => p.objectType === "Trigger",
    );
    if (triggers.length === 0) return [];

    const months = new Map<string, number>();
    for (const t of triggers) {
      if (!t.creationTime) continue;
      const d = new Date(t.creationTime);
      const key = `${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;
      months.set(key, (months.get(key) ?? 0) + 1);
    }

    return [...months.entries()]
      .map(([label, value]) => ({ label, value }))
      .slice(-12);
  }, [allProposals]);

  const table = useReactTable({
    data: proposals,
    columns,
    state: { globalFilter, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = table.getPageCount();

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <h1 className="mb-6 text-[28px] font-bold tracking-tight text-[#10213f] sm:text-[34px]">
        Decentralized Autonomous Organization
      </h1>

      <div className="mb-6 grid gap-6 lg:grid-cols-2 rounded-[24px] shadow-card [&>*]:min-w-0 animate-fade-in-up">
        <div>
          <div className="grid gap-4 grid-cols-2 auto-rows-fr [&>*]:min-w-0">
            <StatCard
              icon={
                <img src="/icons/chart-pie.svg" alt="" className="size-5" />
              }
              label="Available Budget"
              bgImage="/images/dao/available-budget.png"
              value={
                <span className="inline-flex items-center gap-2">
                  {availableBudget.toLocaleString()}
                  <img src="/icons/dash.svg" alt="" className="size-5" />
                </span>
              }
            />
            <StatCard
              icon={
                <img src="/icons/superblock.svg" alt="" className="size-5" />
              }
              label="Proposals Count"
              bgImage="/images/dao/proposal-count.png"
              value={String(proposalCount)}
            />
            <StatCard
              icon={<img src="/icons/dash.svg" alt="" className="size-5" />}
              label="Remaining Budget"
              bgImage="/images/dao/remaining-budget.png"
              value={
                <span className="inline-flex items-center gap-2">
                  {Math.round(remainingBudget).toLocaleString()}
                  <img src="/icons/dash.svg" alt="" className="size-5" />
                </span>
              }
            />
            <StatCard
              icon={
                <img src="/icons/sandglass.svg" alt="" className="size-5" />
              }
              label="Next Payment"
              bgImage="/images/dao/next-payment.png"
              value={nextPaymentDays > 0 ? `${nextPaymentDays} Days` : "—"}
            />
          </div>

          <div className="mt-5 space-y-2 px-5 pb-5 text-[13px] text-muted-foreground">
            <div className="flex items-center gap-6">
              <span className="w-[200px] shrink-0 text-muted-foreground/60">
                Required votes:
              </span>
              <span className="font-medium text-[#10213f]">
                {requiredVotes} <em>Yes</em>
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="w-[200px] shrink-0 text-muted-foreground/60">
                Voting Deadline:
              </span>
              <span className="flex items-center gap-2 font-medium text-[#10213f]">
                {votingDeadline.toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
                <Badge className="h-5 border-0 bg-muted px-2 text-[11px] font-medium text-foreground">
                  in {nextPaymentDays}d
                </Badge>
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="w-[200px] shrink-0 text-muted-foreground/60">
                {fundedProposalCount} proposals with enough votes:
              </span>
              <span className="font-medium text-[#10213f]">
                {Math.round(fundedAmount)} Dash
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="w-[200px] shrink-0 text-muted-foreground/60">
                {unfundedProposalCount} proposals without enough funds:
              </span>
              <span className="font-medium text-[#10213f]">
                {Math.round(unfundedAmount)} Dash
              </span>
            </div>
          </div>
        </div>

        <Card className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[24px] border-0 bg-white shadow-none">
          <CardHeader className="relative px-5 pb-2 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-accent/20 text-accent">
                <img src="/icons/dash.svg" alt="" className="size-7" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-muted-foreground">
                  Superblock Funding Chart
                </p>
                <CardTitle className="mt-1 flex flex-wrap items-baseline gap-2 tracking-[-0.03em]">
                  <span className="text-[32px] font-extrabold text-[#21314d]">
                    {Math.round(fundedAmount).toLocaleString()}
                  </span>
                  <span className="text-[24px] font-medium text-muted-foreground">
                    / {availableBudget.toLocaleString()} DASH
                  </span>
                </CardTitle>
              </div>
            </div>
            <CardAction>
              <Badge className="h-7 gap-1.5 whitespace-nowrap rounded-full border-0 bg-[#EAF0FF] px-2.5 text-[11px] font-medium text-accent">
                <Calendar className="size-3 shrink-0" />1 Month
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="relative flex flex-1 items-end px-3 pb-3 sm:px-4 sm:pb-4">
            {chartData.length > 0 ? (
              <SuperblockFundingChart
                className="rounded-[20px]"
                data={chartData}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No historical data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card
        className="border-0 shadow-none animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        <CardHeader className="px-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Proposals ({proposals.length})
          </CardTitle>
          <CardAction>
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder="Search..."
            />
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto px-3">
          <DataTable
            table={table}
            isFetching={isFetching}
            isEmpty={proposals.length === 0}
            skeletonWidths={skeletonWidths}
            skeletonRows={pagination.pageSize}
            emptyMessage="No proposals found."
            borderless
          />
        </CardContent>
        <Pagination
          page={pagination.pageIndex + 1}
          pageCount={pageCount}
          onPageChange={(p) =>
            setPagination((prev) => ({ ...prev, pageIndex: p - 1 }))
          }
          pageSize={pagination.pageSize}
          onPageSizeChange={(size) =>
            setPagination({ pageIndex: 0, pageSize: size })
          }
        />
      </Card>
    </main>
  );
}
