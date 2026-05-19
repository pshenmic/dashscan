import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
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
import { chainStatsQueryOptions } from "@/lib/api/chain";
import {
  budgetQueryOptions,
  proposalsQueryOptions,
} from "@/lib/api/governance";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import type { ApiGovernanceObject } from "@/lib/api/types";
import {
  formatDuration,
  formatDurationParts,
  formatRelativeTime,
} from "@/lib/format";
import {
  getMsUntilSuperblock,
  getMsUntilVotingDeadline,
  getNextSuperblockHeight,
  getRequiredVotes,
  getSuperblockProgress,
  getVotingDeadline,
  getVotingDeadlineHeight,
  getVotingProgress,
  resolveNetworkFromChain,
} from "@/lib/governance";
import { appStore, type Network } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { cn } from "@/lib/utils";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import { DetailRow } from "@/themes/neo/components/detail-row";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { Badge } from "@/themes/neo/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";

const chartConfig: ChartConfig = {
  value: { label: "Triggers", color: "var(--chart-1)" },
};

const PROPOSALS_PAGE_SIZE = 25;

type SortId = "rank" | "name" | "time" | "votes" | "funding";
type SortDir = "asc" | "desc";

function SortHeader({
  active,
  direction,
  onClick,
  className,
  children,
}: {
  active: boolean;
  direction: SortDir;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 select-none hover:text-foreground",
        active && "text-foreground",
        className,
      )}
    >
      {children}
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-50" />
      )}
    </button>
  );
}

export default function RedesignDaoPage() {
  const storeNetwork = useStore(appStore, (state) => state.network);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PROPOSALS_PAGE_SIZE);
  const [viewMode, setViewMode] = useTableViewMode("dao");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PROPOSALS_PAGE_SIZE);
  const [sortId, setSortId] = useState<SortId>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (id: SortId) => {
    if (sortId === id) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortId(id);
      setSortDir(id === "rank" || id === "name" ? "asc" : "desc");
    }
    setPage(1);
    setVisibleCount(PROPOSALS_PAGE_SIZE);
  };

  const isInfinite = viewMode === "infinite";

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(PROPOSALS_PAGE_SIZE);
    setPage(1);
  };

  const { data: allProposals, isFetching } = useQuery(
    proposalsQueryOptions({ network: storeNetwork, proposalType: "all" }),
  );
  const { data: budget } = useQuery(
    budgetQueryOptions({ network: storeNetwork }),
  );
  const { data: blockData } = useQuery(
    blocksQueryOptions({
      network: storeNetwork,
      page: 1,
      limit: 1,
      order: "desc",
    }),
  );
  const { data: mnData } = useQuery(
    masternodesQueryOptions({ network: storeNetwork, page: 1, limit: 1 }),
  );
  const { data: chainStats } = useQuery(
    chainStatsQueryOptions({ network: storeNetwork }),
  );
  const network = resolveNetworkFromChain(chainStats?.chain, storeNetwork);

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

  const currentHeight = blockData?.resultSet?.[0]?.height ?? 0;
  const masternodeCount = mnData?.pagination?.total ?? 0;
  const requiredVotes = getRequiredVotes(masternodeCount);
  const blockTimeMs = chainStats?.blockTime ?? null;
  const msUntilVoteCutoff = getMsUntilVotingDeadline(
    currentHeight,
    network,
    blockTimeMs,
  );
  const votingOpen = msUntilVoteCutoff > 0;
  const fundedLabel = votingOpen ? "Requested" : "Funded";

  const rankMap = useMemo(() => {
    const ranked = [...proposals].sort(
      (a, b) =>
        (b.yesCount ?? 0) -
        (b.noCount ?? 0) -
        ((a.yesCount ?? 0) - (a.noCount ?? 0)),
    );
    const map = new Map<string, { rank: number; passing: boolean }>();
    ranked.forEach((p, i) => {
      if (!p.hash) return;
      const net = (p.yesCount ?? 0) - (p.noCount ?? 0);
      map.set(p.hash, { rank: i + 1, passing: net >= requiredVotes });
    });
    return map;
  }, [proposals, requiredVotes]);

  const sortedProposals = useMemo(() => {
    const arr = [...filteredProposals];
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: ApiGovernanceObject, b: ApiGovernanceObject): number => {
      switch (sortId) {
        case "rank": {
          const ra = rankMap.get(a.hash ?? "")?.rank ?? Number.MAX_SAFE_INTEGER;
          const rb = rankMap.get(b.hash ?? "")?.rank ?? Number.MAX_SAFE_INTEGER;
          return ra - rb;
        }
        case "name": {
          const na = a.data?.name ?? "";
          const nb = b.data?.name ?? "";
          return na.localeCompare(nb);
        }
        case "time": {
          const ta = a.creationTime ? Date.parse(a.creationTime) : 0;
          const tb = b.creationTime ? Date.parse(b.creationTime) : 0;
          return ta - tb;
        }
        case "votes": {
          const va = (a.yesCount ?? 0) - (a.noCount ?? 0);
          const vb = (b.yesCount ?? 0) - (b.noCount ?? 0);
          return va - vb;
        }
        case "funding": {
          const fa = a.data?.paymentAmount ?? 0;
          const fb = b.data?.paymentAmount ?? 0;
          return fa - fb;
        }
        default:
          return 0;
      }
    };
    arr.sort((a, b) => cmp(a, b) * dir);
    return arr;
  }, [filteredProposals, sortId, sortDir, rankMap]);

  const paged = useMemo(() => {
    if (isInfinite) {
      return sortedProposals.slice(0, visibleCount);
    }
    const start = (page - 1) * pageSize;
    return sortedProposals.slice(start, start + pageSize);
  }, [sortedProposals, visibleCount, isInfinite, page, pageSize]);
  const hasNextPage = visibleCount < sortedProposals.length;

  const availableBudget = budget?.totalBudget ?? 0;
  const proposalCount = budget?.totalProposals ?? proposals.length;
  const enoughFundsTotal = budget?.enoughFundsTotal ?? 0;
  const enoughFundsProposalCount = budget?.enoughFundsCount ?? 0;
  const enoughVotesTotal = budget?.enoughVotesTotal ?? 0;
  const enoughVotesProposalCount = budget?.enoughVotesCount ?? 0;
  const totalRequested = budget?.totalRequested ?? 0;
  const missingVotesAmount = Math.max(0, totalRequested - enoughVotesTotal);
  const missingVotesCount = Math.max(
    0,
    proposalCount - enoughVotesProposalCount,
  );
  const remainingBudget = Math.max(0, availableBudget - enoughFundsTotal);

  const msUntilSuperblock = getMsUntilSuperblock(
    currentHeight,
    network,
    blockTimeMs,
  );
  const nextSuperblockDate = new Date(new Date().getTime() + msUntilSuperblock);
  const votingDeadline = getVotingDeadline(currentHeight, network, blockTimeMs);

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
      id: "rank",
      width: 64,
      header: (
        <SortHeader
          active={sortId === "rank"}
          direction={sortDir}
          onClick={() => toggleSort("rank")}
        >
          #
        </SortHeader>
      ),
      cell: (row) => {
        const info = rankMap.get(row.hash ?? "");
        if (!info) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge
            variant={info.passing ? "soft-success" : "soft"}
            className="min-w-9 justify-center font-mono tabular-nums"
          >
            #{info.rank}
          </Badge>
        );
      },
    },
    {
      id: "name",
      header: (
        <SortHeader
          active={sortId === "name"}
          direction={sortDir}
          onClick={() => toggleSort("name")}
        >
          Proposal
        </SortHeader>
      ),
      cell: (row) => {
        const name = row.data?.name ?? "Untitled";
        const url = row.data?.url;
        const addr = row.data?.paymentAddress;
        return (
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
        );
      },
    },
    {
      id: "time",
      header: (
        <SortHeader
          active={sortId === "time"}
          direction={sortDir}
          onClick={() => toggleSort("time")}
        >
          Created
        </SortHeader>
      ),
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.creationTime ? formatRelativeTime(row.creationTime) : "—"}
        </span>
      ),
    },
    {
      id: "votes",
      header: (
        <SortHeader
          active={sortId === "votes"}
          direction={sortDir}
          onClick={() => toggleSort("votes")}
        >
          Votes
        </SortHeader>
      ),
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="soft-success">
            <ThumbsUp className="size-3" /> {row.yesCount ?? 0}
          </Badge>
          <Badge variant="soft-destructive">
            <ThumbsDown className="size-3" /> {row.noCount ?? 0}
          </Badge>
          <Badge variant="soft">
            <Minus className="size-3" /> Abstain {row.abstainCount ?? 0}
          </Badge>
        </div>
      ),
    },
    {
      id: "funding",
      align: "right",
      header: (
        <SortHeader
          active={sortId === "funding"}
          direction={sortDir}
          onClick={() => toggleSort("funding")}
          className="ml-auto"
        >
          {fundedLabel}
        </SortHeader>
      ),
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
                {availableBudget.toFixed(1)} <DashIcon />
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
              <CardDescription>Total Proposals</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {proposalCount.toLocaleString()} ({totalRequested} <DashIcon />)
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
                {enoughFundsTotal}{" "}
                <span className="text-muted-foreground text-base">
                  / {availableBudget.toFixed(1)} <DashIcon />
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
                {currentHeight > 0 ? formatDuration(msUntilSuperblock) : "—"}
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
                  {msUntilVoteCutoff > 0 ? (
                      <Badge variant="soft-accent">
                        in {formatDuration(msUntilVoteCutoff)}
                      </Badge>
                  ) : (
                      <Badge variant="soft-destructive">Voting closed</Badge>
                  )}
                </DetailRow>
                <DetailRow label="Next superblock payment" className="border-b-0 pb-0">
                  <span>
                    {nextSuperblockDate.toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </DetailRow>
                <DetailRow label="Required Votes" className="border-b-0 pb-0">
                  <span className="font-mono tabular-nums">
                    {requiredVotes.toLocaleString()} Yes
                  </span>
                </DetailRow>
                <DetailRow
                    label="Remaining budget"
                    className="border-b-0 pb-0"
                >
                  <span className="font-mono tabular-nums">
                    {Math.round(remainingBudget).toLocaleString()} <DashIcon />
                  </span>
                </DetailRow>
                <DetailRow
                  label="Passes funding"
                  className="border-b-0 pb-0"
                >
                  <span className="font-mono tabular-nums">
                    {enoughFundsProposalCount} proposals ·{" "}
                    {Math.round(enoughFundsTotal).toLocaleString()} <DashIcon />
                  </span>
                </DetailRow>
                <DetailRow
                  label="Not enough votes"
                  className="border-b-0 pb-0"
                >
                  <span className="font-mono tabular-nums">
                    {missingVotesCount} proposals ·{" "}
                    {Math.round(missingVotesAmount).toLocaleString()} <DashIcon />
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
                  msRemaining={msUntilSuperblock}
                  msUntilVoteCutoff={msUntilVoteCutoff}
                  network={network}
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
  msRemaining,
  msUntilVoteCutoff,
  network,
}: {
  currentHeight: number;
  msRemaining: number;
  msUntilVoteCutoff: number;
  network: Network;
}) {
  const sbProgress = getSuperblockProgress(currentHeight, network);
  const sbHeight = getNextSuperblockHeight(currentHeight, network);
  const voteProgress = getVotingProgress(currentHeight, network);
  const voteHeight = getVotingDeadlineHeight(currentHeight, network);

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
      <div className="relative flex w-full max-w-md items-center justify-center gap-6">
        <CountdownRing
          label="Voting closes"
          subLabel={
            voteProgress >= 1
              ? "Voting closed"
              : `#${voteHeight.toLocaleString()}`
          }
          msRemaining={msUntilVoteCutoff}
          progress={voteProgress}
          accent="var(--accent-violet)"
          icon={<Vote className="size-3" />}
        />
        <CountdownRing
          label="Next superblock"
          subLabel={`#${sbHeight.toLocaleString()}`}
          msRemaining={msRemaining}
          progress={sbProgress}
          accent="var(--accent)"
          icon={<CalendarClock className="size-3" />}
        />
      </div>
    </div>
  );
}

function CountdownRing({
  label,
  subLabel,
  msRemaining,
  progress,
  accent,
  icon,
}: {
  label: string;
  subLabel: string;
  msRemaining: number;
  progress: number;
  accent: string;
  icon: React.ReactNode;
}) {
  const { value, unit } = formatDurationParts(msRemaining);
  const circumference = 2 * Math.PI * 48;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative flex size-28 items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 112 112" aria-hidden>
          <title>{label}</title>
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="none"
            strokeWidth="6"
            className="stroke-border/40"
          />
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
            stroke={accent}
            style={{
              filter: `drop-shadow(0 0 6px color-mix(in oklab, ${accent} 60%, transparent))`,
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display-num text-2xl tabular-nums leading-none text-foreground">
            {value}
          </span>
          <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <Badge
          variant="soft"
          className="font-mono"
          style={{ color: accent, borderColor: `${accent}33` }}
        >
          {icon}
          {label}
        </Badge>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {subLabel}
        </span>
      </div>
    </div>
  );
}
