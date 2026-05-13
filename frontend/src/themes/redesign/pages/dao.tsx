import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import {
  CalendarClock,
  Coins,
  ExternalLink,
  FileText,
  Minus,
  ThumbsDown,
  ThumbsUp,
  Vote,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DashIcon } from "@/components/dash-icon";
import { Button } from "@/components/ui/button";
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
  getNextSuperblockHeight,
  getRequiredVotes,
  getSuperblockProgress,
  getVotingDeadline,
} from "@/lib/governance";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { cn } from "@/lib/utils";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/redesign/components/data-table";
import { DetailRow } from "@/themes/redesign/components/detail-row";
import { HashDisplay } from "@/themes/redesign/components/hash-display";
import { Badge } from "@/themes/redesign/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/redesign/components/ui/card";

const chartConfig: ChartConfig = {
  value: { label: "Triggers", color: "var(--chart-1)" },
};

const PROPOSALS_PAGE_SIZE = 25;

export default function RedesignDaoPage() {
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
      id: "name",
      header: "Proposal",
      cell: (row) => {
        const name = row.data?.name ?? "Untitled";
        const url = row.data?.url;
        const addr = row.data?.paymentAddress;
        const yes = row.yesCount ?? 0;
        const no = row.noCount ?? 0;
        const net = (row.absoluteYesCount ?? yes - no) || 0;
        const isPassing = net > 0;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                isPassing
                  ? "bg-success/12 [&_svg]:text-success"
                  : "bg-accent/12 [&_svg]:text-accent",
              )}
            >
              <Vote className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-1.5">
                {url ? (
                  <Button
                    asChild
                    variant="link"
                    className="h-auto truncate p-0 text-sm font-medium"
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
                ) : (
                  <span className="truncate text-sm font-medium">{name}</span>
                )}
                {url && (
                  <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                )}
              </div>
              {addr ? (
                <HashDisplay
                  value={addr}
                  href="/address/$address"
                  params={{ address: addr }}
                  copy={false}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  No payment address
                </span>
              )}
            </div>
          </div>
        );
      },
    },
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
          <span className="font-mono text-sm font-medium tabular-nums text-accent">
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
              <CardDescription>
                {chartData.length > 0
                  ? "Triggers per month"
                  : "Countdown to next funding cycle"}
              </CardDescription>
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
                <SuperblockCountdown
                  currentHeight={currentHeight}
                  daysRemaining={nextPaymentDays}
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

function SuperblockCountdown({
  currentHeight,
  daysRemaining,
}: {
  currentHeight: number;
  daysRemaining: number;
}) {
  const progress = getSuperblockProgress(currentHeight);
  const nextHeight = getNextSuperblockHeight(currentHeight);
  const circumference = 2 * Math.PI * 56;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative flex h-[260px] flex-col items-center justify-center gap-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 40%, color-mix(in oklab, var(--accent) 12%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative flex size-36 items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
          <title>Next superblock progress</title>
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            strokeWidth="6"
            className="stroke-border/40"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out"
            style={{
              filter:
                "drop-shadow(0 0 6px color-mix(in oklab, var(--accent) 60%, transparent))",
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display-num text-3xl tabular-nums leading-none text-foreground">
            {daysRemaining}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            days left
          </span>
        </div>
      </div>
      <div className="relative flex flex-col items-center gap-0.5 text-center">
        <Badge variant="soft-accent" className="font-mono">
          <CalendarClock className="size-3" />
          Next superblock · #{nextHeight.toLocaleString()}
        </Badge>
        <p className="max-w-xs text-xs text-muted-foreground">
          Funding cycle in progress · {Math.round(progress * 100)}% to next
          payout
        </p>
      </div>
    </div>
  );
}
