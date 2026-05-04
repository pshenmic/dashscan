import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  CalendarClock,
  Coins,
  FileText,
  Minus,
  ThumbsDown,
  ThumbsUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DashIcon } from "@/components/dash-icon";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DetailRow } from "@/components/detail-row";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useTableViewMode } from "@/lib/use-table-view-mode";

const chartConfig: ChartConfig = {
  value: { label: "Triggers", color: "var(--chart-1)" },
};

export const Route = createFileRoute("/dao")({
  component: DaoPage,
  head: () => ({ meta: [{ title: "DAO | DashScan" }] }),
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

const PROPOSALS_PAGE_SIZE = 25;

function DaoPage() {
  const network = useStore(appStore, (state) => state.network);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PROPOSALS_PAGE_SIZE);
  const [viewMode, setViewMode] = useTableViewMode("dao");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PROPOSALS_PAGE_SIZE);

  const isInfinite = viewMode === "infinite";

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(PROPOSALS_PAGE_SIZE);
    setPage(1);
  };

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

  const filteredProposals = useMemo(() => {
    if (!search) return proposals;
    const q = search.toLowerCase();
    return proposals.filter(
      (p) =>
        p.data?.name?.toLowerCase().includes(q) ||
        p.data?.paymentAddress?.toLowerCase().includes(q) ||
        p.hash?.toLowerCase().includes(q),
    );
  }, [proposals, search]);

  const paged = useMemo(() => {
    if (isInfinite) {
      return filteredProposals.slice(0, visibleCount);
    }
    const start = (page - 1) * pageSize;
    return filteredProposals.slice(start, start + pageSize);
  }, [filteredProposals, visibleCount, isInfinite, page, pageSize]);
  const hasNextPage = visibleCount < filteredProposals.length;

  const currentHeight = blockData?.resultSet?.[0]?.height ?? 0;
  const masternodeCount = mnData?.pagination?.total ?? 0;

  const availableBudget = budget?.totalBudget ?? 0;
  const proposalCount = budget?.totalProposals ?? proposals.length;
  const fundedAmount = budget?.enoughFundsTotal ?? 0;
  const fundedProposalCount = budget?.enoughFundsCount ?? 0;
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

  const columns: DataTableColumn<ApiGovernanceObject>[] = [
    {
      id: "time",
      header: "Created",
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.creationTime ? formatRelativeTime(row.creationTime) : "—"}
        </span>
      ),
    },
    {
      id: "name",
      header: "Proposal",
      cell: (row) => {
        const name = row.data?.name;
        const url = row.data?.url;
        if (!name) return <span className="text-muted-foreground">—</span>;
        if (url) {
          return (
            <Button
              asChild
              variant="link"
              className="h-auto p-0 text-sm font-medium"
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {name}
              </a>
            </Button>
          );
        }
        return <span className="text-sm font-medium">{name}</span>;
      },
    },
    {
      id: "address",
      header: "Payment Address",
      cell: (row) => {
        const addr = row.data?.paymentAddress;
        if (!addr) return <span className="text-muted-foreground">—</span>;
        return (
          <HashDisplay
            value={addr}
            href="/address/$address"
            params={{ address: addr }}
          />
        );
      },
    },
    {
      id: "votes",
      header: "Votes",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="soft-success">
            <ThumbsUp className="size-3" /> {row.yesCount ?? 0}
          </Badge>
          <Badge variant="soft-destructive">
            <ThumbsDown className="size-3" /> {row.noCount ?? 0}
          </Badge>
          <Badge variant="soft">
            <Minus className="size-3" /> {row.abstainCount ?? 0}
          </Badge>
        </div>
      ),
    },
    {
      id: "funding",
      header: "Funding",
      align: "right",
      cell: (row) => {
        const amount = row.data?.paymentAmount;
        if (amount == null)
          return <span className="text-muted-foreground">—</span>;
        return (
          <span className="font-mono text-sm tabular-nums">
            {amount.toLocaleString()} <DashIcon />
          </span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Governance
          </h1>
          <p className="text-sm text-muted-foreground">
            Decentralized proposals and superblock funding.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Available Budget</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {availableBudget.toLocaleString()} <DashIcon />
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Wallet className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Proposals</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {proposalCount.toLocaleString()}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <FileText className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Funded</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {fundedProposalCount}{" "}
                <span className="text-muted-foreground text-base">
                  / {Math.round(fundedAmount).toLocaleString()} <DashIcon />
                </span>
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Coins className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Next Superblock</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {nextPaymentDays > 0 ? `${nextPaymentDays} days` : "—"}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <CalendarClock className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Voting Status</CardTitle>
              <CardDescription>
                Funding requirements and current vote tally.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-4">
                <DetailRow label="Required Votes" className="border-b-0 pb-0">
                  <span className="font-mono tabular-nums">
                    {requiredVotes.toLocaleString()} Yes
                  </span>
                </DetailRow>
                <DetailRow label="Voting Deadline" className="border-b-0 pb-0">
                  <span>
                    {votingDeadline.toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {nextPaymentDays > 0 && (
                    <Badge variant="soft-accent">in {nextPaymentDays}d</Badge>
                  )}
                </DetailRow>
                <DetailRow
                  label="With Enough Votes"
                  className="border-b-0 pb-0"
                >
                  <span className="font-mono tabular-nums">
                    {fundedProposalCount} proposals ·{" "}
                    {Math.round(fundedAmount).toLocaleString()} <DashIcon />
                  </span>
                </DetailRow>
                <DetailRow
                  label="Without Enough Funds"
                  className="border-b-0 pb-0"
                >
                  <span className="font-mono tabular-nums">
                    {unfundedProposalCount} proposals ·{" "}
                    {Math.round(unfundedAmount).toLocaleString()} <DashIcon />
                  </span>
                </DetailRow>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Superblock Activity</CardTitle>
              <CardDescription>Triggers per month</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[260px] w-full"
                >
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={40}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="value"
                      fill="var(--color-value)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyState
                  title="No historical superblock triggers available"
                  className="h-[260px]"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <DataTable
          columns={columns}
          data={paged}
          isLoading={isFetching && filteredProposals.length === 0}
          rowKey={(row, idx) => row.hash ?? `proposal-${idx}`}
          search={{
            value: search,
            onChange: handleSearchChange,
            placeholder: "Search proposals…",
          }}
          emptyTitle="No proposals"
          viewMode={{ value: viewMode, onChange: setViewMode }}
          infiniteScroll={{
            hasNextPage,
            isFetchingNextPage: false,
            onLoadMore: () => setVisibleCount((c) => c + PROPOSALS_PAGE_SIZE),
            total: filteredProposals.length,
            loaded: paged.length,
            skeletonRows: 5,
          }}
          pagination={{
            pageIndex: page,
            pageSize,
            total: filteredProposals.length,
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
