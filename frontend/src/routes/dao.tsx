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
import { DataTable, type DataTableColumn } from "@/components/data-table";
import {
  type DescriptionItem,
  DescriptionList,
} from "@/components/description-list";
import { HashDisplay } from "@/components/hash-display";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

function DaoPage() {
  const network = useStore(appStore, (state) => state.network);
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    const start = (pageIndex - 1) * pageSize;
    return filteredProposals.slice(start, start + pageSize);
  }, [filteredProposals, pageIndex, pageSize]);

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

  const fundingItems: DescriptionItem[] = [
    {
      label: "Required Votes",
      value: (
        <span className="font-mono text-sm tabular-nums">
          {requiredVotes.toLocaleString()} Yes
        </span>
      ),
    },
    {
      label: "Voting Deadline",
      value: (
        <span className="flex flex-wrap items-center gap-2">
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
        </span>
      ),
    },
    {
      label: "With Enough Votes",
      value: (
        <span className="font-mono text-sm tabular-nums">
          {fundedProposalCount} proposals ·{" "}
          {Math.round(fundedAmount).toLocaleString()} DASH
        </span>
      ),
    },
    {
      label: "Without Enough Funds",
      value: (
        <span className="font-mono text-sm tabular-nums">
          {unfundedProposalCount} proposals ·{" "}
          {Math.round(unfundedAmount).toLocaleString()} DASH
        </span>
      ),
    },
  ];

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
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent no-underline hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </a>
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
            {amount.toLocaleString()}{" "}
            <span className="text-muted-foreground">DASH</span>
          </span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Governance"
          subtitle="Decentralized proposals and superblock funding."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Available Budget"
            value={
              <span>
                {availableBudget.toLocaleString()}{" "}
                <span className="text-muted-foreground text-base">DASH</span>
              </span>
            }
            icon={<Wallet />}
          />
          <KpiCard
            label="Proposals"
            value={proposalCount.toLocaleString()}
            icon={<FileText />}
          />
          <KpiCard
            label="Funded"
            value={
              <span>
                {fundedProposalCount}{" "}
                <span className="text-muted-foreground text-base">
                  / {Math.round(fundedAmount).toLocaleString()} DASH
                </span>
              </span>
            }
            icon={<Coins />}
          />
          <KpiCard
            label="Next Superblock"
            value={nextPaymentDays > 0 ? `${nextPaymentDays} days` : "—"}
            icon={<CalendarClock />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Voting Status
            </h2>
            <DescriptionList items={fundingItems} columns={1} />
          </Card>

          <Card className="p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Superblock Activity
              </h2>
              <span className="text-xs text-muted-foreground">
                Triggers per month
              </span>
            </div>
            {chartData.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="mt-4 aspect-auto h-[260px] w-full"
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
              <div className="mt-4 flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                No historical superblock triggers available.
              </div>
            )}
          </Card>
        </div>

        <DataTable
          columns={columns}
          data={paged}
          isLoading={isFetching}
          rowKey={(row, idx) => row.hash ?? `proposal-${idx}`}
          search={{
            value: search,
            onChange: (v) => {
              setSearch(v);
              setPageIndex(1);
            },
            placeholder: "Search proposals…",
          }}
          emptyTitle="No proposals"
          pagination={{
            pageIndex,
            pageSize,
            total: filteredProposals.length,
            onPageChange: setPageIndex,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPageIndex(1);
            },
          }}
        />
      </div>
    </div>
  );
}
