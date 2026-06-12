import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  BarChart3,
  CalendarClock,
  ChartNoAxesColumn,
  CheckCircle2,
  ExternalLink,
  FileText,
  Landmark,
  Minus,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
  Vote,
  Wallet,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { DashIcon } from "@/components/dash-icon";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { blocksQueryOptions } from "@/lib/api/blocks";
import { chainStatsQueryOptions } from "@/lib/api/chain";
import {
  proposalQueryOptions,
  proposalVotesChartQueryOptions,
} from "@/lib/api/governance";
import { masternodesQueryOptions } from "@/lib/api/masternodes";
import { priceQueryOptions } from "@/lib/api/price";
import type {
  ApiProposalVote,
  ApiVoteOutcome,
  ApiVoteResult,
} from "@/lib/api/types";
import {
  formatCompactUsd,
  formatDuration,
  formatRelativeTime,
} from "@/lib/format";
import {
  getMsUntilVotingDeadline,
  getRequiredVotes,
  getVotingDeadline,
  resolveNetworkFromChain,
} from "@/lib/governance";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/themes/neo/components/copy-button";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import { DetailRow } from "@/themes/neo/components/detail-row";
import { EmptyState } from "@/themes/neo/components/empty-state";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { ShareButton } from "@/themes/neo/components/share-button";
import { Badge } from "@/themes/neo/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/themes/neo/components/ui/card";
import { OutcomeBadge, SignalBadge } from "@/themes/neo/components/vote-badges";

const VOTES_PAGE_SIZE = 25;

type ChartRange = "24h" | "7d" | "30d" | "all";
type ChartMode = "interval" | "cumulative";
type OutcomeFilter = "all" | ApiVoteOutcome;

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "all", label: "All" },
];

const RANGE_MS: Record<Exclude<ChartRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const RANGE_BUCKETS: Record<ChartRange, number> = {
  "24h": 24,
  "7d": 28,
  "30d": 30,
  all: 36,
};

const chartConfig: ChartConfig = {
  yes: { label: "Yes", color: "var(--success)" },
  no: { label: "No", color: "var(--destructive)" },
  abstain: { label: "Abstain", color: "var(--chart-3)" },
};

function VoteTallyBlock({
  result,
  requiredVotes,
}: {
  result: ApiVoteResult;
  requiredVotes: number;
}) {
  const net = result.absoluteYesCount;
  const progress =
    requiredVotes > 0 ? Math.min(1, Math.max(0, net / requiredVotes)) : 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-success/20 bg-success/5 py-3">
          <ThumbsUp className="size-4 text-success" />
          <span className="font-display-num text-xl text-success">
            {result.yesCount.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Yes
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-destructive/20 bg-destructive/5 py-3">
          <ThumbsDown className="size-4 text-destructive" />
          <span className="font-display-num text-xl text-destructive">
            {result.noCount.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            No
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-secondary/40 py-3">
          <Minus className="size-4 text-muted-foreground" />
          <span className="font-display-num text-xl text-muted-foreground">
            {result.abstainCount.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Abstain
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Net yes votes</span>
          <span
            className={cn(
              "font-mono font-semibold tabular-nums",
              net >= requiredVotes
                ? "text-success"
                : net >= 0
                  ? "text-foreground"
                  : "text-destructive",
            )}
          >
            {net >= 0 ? "+" : ""}
            {net.toLocaleString()} / {requiredVotes.toLocaleString()} required
          </span>
        </div>
        <Progress
          value={progress * 100}
          className={cn(
            net >= requiredVotes &&
              "[&>[data-slot=progress-indicator]]:bg-success",
          )}
        />
      </div>
    </div>
  );
}

function SecondarySignalRow({
  icon,
  label,
  hint,
  result,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  result: ApiVoteResult | null;
}) {
  const empty =
    !result ||
    (result.yesCount === 0 &&
      result.noCount === 0 &&
      result.abstainCount === 0);
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default items-center gap-2 text-sm text-muted-foreground">
            {icon}
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{hint}</TooltipContent>
      </Tooltip>
      {empty ? (
        <span className="text-xs text-muted-foreground">No votes</span>
      ) : (
        <span className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
          <span className="text-success">{result.yesCount}</span>
          <span className="text-destructive">{result.noCount}</span>
          <span className="text-muted-foreground">{result.abstainCount}</span>
        </span>
      )}
    </div>
  );
}

interface RedesignProposalDetailPageProps {
  hash: string;
}

export default function RedesignProposalDetailPage({
  hash,
}: RedesignProposalDetailPageProps) {
  const storeNetwork = useStore(appStore, (state) => state.network);
  const [range, setRange] = useState<ChartRange>("all");
  const [mode, setMode] = useState<ChartMode>("cumulative");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useTableViewMode("proposal-votes");
  const [visibleCount, setVisibleCount] = useState(VOTES_PAGE_SIZE);
  const isInfinite = viewMode === "infinite";
  const gradientIds = {
    yes: useId(),
    no: useId(),
    abstain: useId(),
  };

  const { data: proposal, isFetching } = useQuery(
    proposalQueryOptions({ network: storeNetwork, hash }),
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
  const { data: usdPrice } = useQuery(
    priceQueryOptions({ network: storeNetwork, currency: "usd" }),
  );

  const network = resolveNetworkFromChain(chainStats?.chain, storeNetwork);
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
  const votingDeadline = getVotingDeadline(currentHeight, network, blockTimeMs);

  const votes = useMemo(() => proposal?.votes ?? [], [proposal]);

  const funding: ApiVoteResult = proposal?.fundingResult ?? {
    absoluteYesCount: proposal?.absoluteYesCount ?? 0,
    yesCount: proposal?.yesCount ?? 0,
    noCount: proposal?.noCount ?? 0,
    abstainCount: proposal?.abstainCount ?? 0,
  };
  const fundingBallots =
    funding.yesCount + funding.noCount + funding.abstainCount;
  const fundingMasternodes = useMemo(
    () =>
      new Set(
        votes.filter((v) => v.signal === "funding").map((v) => v.outpoint),
      ).size,
    [votes],
  );
  const participation =
    fundingMasternodes > 0 && masternodeCount > 0
      ? fundingMasternodes / masternodeCount
      : null;
  const isPassing =
    proposal?.enoughVotes ?? funding.absoluteYesCount >= requiredVotes;

  const rangeBounds = useMemo(() => {
    const end = new Date();
    end.setSeconds(0, 0);
    const fallbackStart = end.getTime() - RANGE_MS["30d"];
    const start =
      range === "all"
        ? new Date(
            proposal?.creationTime
              ? Date.parse(proposal.creationTime)
              : fallbackStart,
          )
        : new Date(end.getTime() - RANGE_MS[range]);
    return { start, end };
  }, [range, proposal?.creationTime]);

  const { data: apiChart, isFetching: isChartFetching } = useQuery({
    ...proposalVotesChartQueryOptions({
      network: storeNetwork,
      hash,
      timestampStart: rangeBounds.start.toISOString(),
      timestampEnd: rangeBounds.end.toISOString(),
      intervalsCount: RANGE_BUCKETS[range],
      runningTotal: mode === "cumulative",
    }),
    enabled: !!proposal,
  });

  const chartData = useMemo(
    () =>
      (apiChart ?? []).map((p) => ({
        timestamp: p.timestamp,
        yes: p.data.yes,
        no: p.data.no,
        abstain: p.data.abstain,
      })),
    [apiChart],
  );
  const isChartLoading = isChartFetching && apiChart === undefined;
  const chartUnavailable = apiChart === null;
  const chartHasVotes = chartData.some(
    (p) => p.yes > 0 || p.no > 0 || p.abstain > 0,
  );

  const uniqueMasternodes = useMemo(
    () => new Set(votes.map((v) => v.outpoint)).size,
    [votes],
  );

  const filteredVotes = useMemo(() => {
    const sorted = [...votes].sort(
      (a, b) => Date.parse(b.time) - Date.parse(a.time),
    );
    const q = search.trim().toLowerCase();
    return sorted.filter((v) => {
      if (outcomeFilter !== "all" && v.outcome !== outcomeFilter) return false;
      if (!q) return true;
      return (
        v.outpoint.toLowerCase().includes(q) ||
        (v.proTxHash?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [votes, outcomeFilter, search]);

  const pagedVotes = useMemo(() => {
    if (isInfinite) return filteredVotes.slice(0, visibleCount);
    return filteredVotes.slice(
      (page - 1) * VOTES_PAGE_SIZE,
      page * VOTES_PAGE_SIZE,
    );
  }, [filteredVotes, page, isInfinite, visibleCount]);
  const hasMoreVotes = visibleCount < filteredVotes.length;

  if (isFetching && !proposal) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-4 h-48 w-full" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton key={k} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="mt-4 h-80 w-full" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="Proposal not found"
          description={`No governance object matched ${hash.slice(0, 16)}… on the current network. It may belong to a past cycle or another network.`}
          icon={<Vote className="size-6" />}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/dao">Back to Governance</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const name = proposal.name ?? "Untitled proposal";
  const amount = proposal.paymentAmount;
  const startDate = proposal.startEpoch
    ? new Date(proposal.startEpoch * 1000)
    : null;
  const endDate = proposal.endEpoch ? new Date(proposal.endEpoch * 1000) : null;

  const voteColumns: DataTableColumn<ApiProposalVote>[] = [
    {
      id: "masternode",
      header: "Masternode",
      cell: (row) =>
        row.proTxHash ? (
          <HashDisplay
            value={row.proTxHash}
            href="/masternodes/$hash"
            params={{ hash: row.proTxHash }}
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {row.outpoint.slice(0, 8)}…{row.outpoint.slice(-6)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">
              Collateral outpoint {row.outpoint}. This masternode is no longer
              in the registered set, so its ProTx hash can't be resolved.
            </TooltipContent>
          </Tooltip>
        ),
    },
    {
      id: "signal",
      header: "Signal",
      cell: (row) => <SignalBadge signal={row.signal} />,
    },
    {
      id: "outcome",
      header: "Vote",
      cell: (row) => <OutcomeBadge outcome={row.outcome} />,
    },
    {
      id: "time",
      align: "right",
      header: "Cast",
      cell: (row) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {formatRelativeTime(row.time)}
            </span>
          </TooltipTrigger>
          <TooltipContent>{new Date(row.time).toLocaleString()}</TooltipContent>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dao">Governance</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-56 truncate">
                  {name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <Card variant="floating" className="hero-surface overflow-hidden">
          <CardContent className="flex flex-col gap-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft-accent" className="gap-1.5">
                <FileText className="size-3" />
                {proposal.objectType === "Trigger" ? "Trigger" : "Proposal"}
              </Badge>
              {isPassing ? (
                <Badge variant="soft-success" className="gap-1.5">
                  <CheckCircle2 className="size-3" /> Passing threshold
                </Badge>
              ) : (
                <Badge variant="soft" className="gap-1.5">
                  <TrendingUp className="size-3" /> Below threshold
                </Badge>
              )}
              {votingOpen ? (
                <Badge variant="soft-accent" className="gap-1.5">
                  <Vote className="size-3" /> Voting open
                </Badge>
              ) : (
                <Badge variant="soft" className="gap-1.5">
                  <Vote className="size-3" /> Voting closed
                </Badge>
              )}
              {proposal.localValidity === false && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="soft-destructive" className="gap-1.5">
                      <ShieldAlert className="size-3" /> Flagged invalid
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    {proposal.isValidReason ||
                      "The queried node currently deems this object invalid."}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <h1 className="font-display text-2xl sm:text-3xl">{name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {proposal.creationTime && (
                    <span>
                      Submitted {formatRelativeTime(proposal.creationTime)}
                    </span>
                  )}
                  {startDate && endDate && (
                    <>
                      <span className="text-border">·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" />
                        {startDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" → "}
                        {endDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {proposal.url && (
                <Button asChild className="w-fit shrink-0">
                  <a
                    href={proposal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Full proposal <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 backdrop-blur-sm">
              <Landmark className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm">
                {proposal.hash ?? hash}
              </span>
              <CopyButton value={proposal.hash ?? hash} label="Proposal hash" />
              <ShareButton
                title={`Dash proposal ${name}`}
                text="Dash governance proposal details"
                iconOnly
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Requested</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {amount != null ? amount.toLocaleString() : "—"} <DashIcon />
              </CardTitle>
              <CardDescription>
                {amount != null && usdPrice?.usd != null
                  ? `≈ ${formatCompactUsd(amount * usdPrice.usd)}`
                  : "per superblock cycle"}
              </CardDescription>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Wallet className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Net funding votes</CardDescription>
              <CardTitle
                className={cn(
                  "text-2xl tabular-nums",
                  funding.absoluteYesCount >= requiredVotes
                    ? "text-success"
                    : "text-foreground",
                )}
              >
                {funding.absoluteYesCount >= 0 ? "+" : ""}
                {funding.absoluteYesCount.toLocaleString()}
              </CardTitle>
              <CardDescription>
                of {requiredVotes.toLocaleString()} required
              </CardDescription>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-success/12 [&_svg]:text-success">
                  <ThumbsUp className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Participation</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {(fundingMasternodes > 0
                  ? fundingMasternodes
                  : fundingBallots
                ).toLocaleString()}
              </CardTitle>
              <CardDescription>
                {participation != null
                  ? `${(participation * 100).toFixed(1)}% of ${masternodeCount.toLocaleString()} masternodes voted`
                  : "weighted ballots cast"}
              </CardDescription>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Users className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Voting deadline</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {currentHeight > 0
                  ? votingOpen
                    ? formatDuration(msUntilVoteCutoff)
                    : "Closed"
                  : "—"}
              </CardTitle>
              <CardDescription>
                {currentHeight > 0
                  ? votingDeadline.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "awaiting chain data"}
              </CardDescription>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <CalendarClock className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Vote dynamics</CardTitle>
              <CardDescription>
                Funding votes cast during the current superblock cycle
              </CardDescription>
              <CardAction>
                <div className="flex items-center gap-2">
                  <ToggleGroup
                    type="single"
                    size="sm"
                    value={mode}
                    onValueChange={(v) => {
                      if (v === "interval" || v === "cumulative") setMode(v);
                    }}
                    aria-label="Chart mode"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem
                          value="interval"
                          aria-label="Per interval"
                        >
                          <BarChart3 className="size-4" />
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent>Per interval</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem
                          value="cumulative"
                          aria-label="Cumulative"
                        >
                          <TrendingUp className="size-4" />
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent>Cumulative</TooltipContent>
                    </Tooltip>
                  </ToggleGroup>
                  <ToggleGroup
                    type="single"
                    size="sm"
                    value={range}
                    onValueChange={(v) => {
                      if (v) setRange(v as ChartRange);
                    }}
                    aria-label="Chart range"
                  >
                    {RANGE_OPTIONS.map((opt) => (
                      <ToggleGroupItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              {isChartLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : chartUnavailable ? (
                <EmptyState
                  title="Vote dynamics unavailable"
                  description="This network's API doesn't expose the votes chart yet. Check back soon."
                  icon={<ChartNoAxesColumn className="size-6" />}
                  className="h-[280px]"
                />
              ) : chartHasVotes ? (
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[280px] w-full"
                >
                  {mode === "cumulative" ? (
                    <AreaChart
                      data={chartData}
                      margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                    >
                      <defs>
                        {(["yes", "no", "abstain"] as const).map((key) => (
                          <linearGradient
                            key={key}
                            id={gradientIds[key]}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={`var(--color-${key})`}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor={`var(--color-${key})`}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="color-mix(in oklab, var(--foreground) 12%, transparent)"
                      />
                      <XAxis
                        dataKey="timestamp"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        tickFormatter={(v) =>
                          range === "24h"
                            ? new Date(v).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : new Date(v).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                        }
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={44}
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => {
                              const ts = payload?.[0]?.payload?.timestamp;
                              return ts ? new Date(ts).toLocaleString() : "";
                            }}
                          />
                        }
                      />
                      {(["yes", "no", "abstain"] as const).map((key) => (
                        <Area
                          key={key}
                          dataKey={key}
                          type="monotone"
                          stroke={`var(--color-${key})`}
                          strokeWidth={2}
                          fill={`url(#${gradientIds[key]})`}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="color-mix(in oklab, var(--foreground) 12%, transparent)"
                      />
                      <XAxis
                        dataKey="timestamp"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        tickFormatter={(v) =>
                          range === "24h"
                            ? new Date(v).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : new Date(v).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                        }
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={44}
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => {
                              const ts = payload?.[0]?.payload?.timestamp;
                              return ts ? new Date(ts).toLocaleString() : "";
                            }}
                          />
                        }
                      />
                      <Bar
                        dataKey="yes"
                        stackId="votes"
                        fill="var(--color-yes)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="no"
                        stackId="votes"
                        fill="var(--color-no)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="abstain"
                        stackId="votes"
                        fill="var(--color-abstain)"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ChartContainer>
              ) : (
                <EmptyState
                  title="No votes in this range"
                  description="Try a wider range — votes reset every superblock cycle, so older history isn't retained."
                  icon={<ChartNoAxesColumn className="size-6" />}
                  className="h-[280px]"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vote results</CardTitle>
              <CardDescription>
                Funding is the decisive signal for payout
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <VoteTallyBlock result={funding} requiredVotes={requiredVotes} />
              <div className="flex flex-col divide-y divide-border/60 border-t border-border/60 pt-1">
                <SecondarySignalRow
                  icon={<Trash2 className="size-3.5" />}
                  label="Delete"
                  hint="Whether masternodes want this object removed from the governance list."
                  result={proposal.deleteResult}
                />
                <SecondarySignalRow
                  icon={<CheckCircle2 className="size-3.5" />}
                  label="Endorsed"
                  hint="Legacy watchdog endorsement signal — effectively unused on modern networks."
                  result={proposal.endorsedResult}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
              <DetailRow label="Payment Address">
                {proposal.paymentAddress ? (
                  <HashDisplay
                    value={proposal.paymentAddress}
                    href="/address/$address"
                    params={{ address: proposal.paymentAddress }}
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="Collateral Hash">
                {proposal.collateralHash ? (
                  <HashDisplay
                    value={proposal.collateralHash}
                    href="/transactions/$hash"
                    params={{ hash: proposal.collateralHash }}
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="Payment Window">
                {startDate && endDate ? (
                  <span>
                    {startDate.toLocaleDateString()} —{" "}
                    {endDate.toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="Submitted">
                {proposal.creationTime ? (
                  <>
                    <span>
                      {new Date(proposal.creationTime).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatRelativeTime(proposal.creationTime)})
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Masternode votes
              </h2>
              <p className="text-sm text-muted-foreground">
                {votes.length.toLocaleString()} votes from{" "}
                {uniqueMasternodes.toLocaleString()} masternodes this cycle
              </p>
            </div>
          </div>
          <DataTable
            columns={voteColumns}
            data={pagedVotes}
            isLoading={false}
            rowKey={(row) => `${row.outpoint}-${row.signal}-${row.time}`}
            search={{
              value: search,
              onChange: (v) => {
                setSearch(v);
                setPage(1);
                setVisibleCount(VOTES_PAGE_SIZE);
              },
              placeholder: "Filter by ProTx hash or outpoint…",
            }}
            toolbar={
              <ToggleGroup
                type="single"
                size="sm"
                value={outcomeFilter}
                onValueChange={(v) => {
                  if (v) {
                    setOutcomeFilter(v as OutcomeFilter);
                    setPage(1);
                    setVisibleCount(VOTES_PAGE_SIZE);
                  }
                }}
                aria-label="Filter by outcome"
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem
                  value="yes"
                  className="data-[state=on]:text-success"
                >
                  <ThumbsUp className="size-3.5" /> Yes
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="no"
                  className="data-[state=on]:text-destructive"
                >
                  <ThumbsDown className="size-3.5" /> No
                </ToggleGroupItem>
                <ToggleGroupItem value="abstain">
                  <Minus className="size-3.5" /> Abstain
                </ToggleGroupItem>
              </ToggleGroup>
            }
            emptyTitle="No votes recorded"
            emptyDescription={
              votes.length > 0
                ? "No votes match the current filters."
                : "No masternode has voted on this proposal in the current cycle yet."
            }
            viewMode={{ value: viewMode, onChange: setViewMode }}
            infiniteScroll={{
              hasNextPage: hasMoreVotes,
              isFetchingNextPage: false,
              onLoadMore: () =>
                setVisibleCount((count) => count + VOTES_PAGE_SIZE),
              total: filteredVotes.length,
              loaded: pagedVotes.length,
              skeletonRows: 5,
            }}
            pagination={{
              pageIndex: page,
              pageSize: VOTES_PAGE_SIZE,
              total: filteredVotes.length,
              onPageChange: setPage,
            }}
          />
        </section>
      </div>
    </div>
  );
}
