import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import {
  Activity,
  Award,
  Boxes,
  Coins,
  Crown,
  Globe2,
  HandCoins,
  KeyRound,
  Minus,
  Send,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Vote,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { proposalsQueryOptions } from "@/lib/api/governance";
import {
  masternodeQueryOptions,
  masternodeVotesQueryOptions,
} from "@/lib/api/masternodes";
import type { ApiProposalVote } from "@/lib/api/types";
import { formatRelativeTime, getIp } from "@/lib/format";
import { appStore } from "@/lib/store";
import { useTableViewMode } from "@/lib/use-table-view-mode";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/themes/neo/components/copy-button";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/neo/components/data-table";
import { DetailRow } from "@/themes/neo/components/detail-row";
import { EmptyState, NotFoundState } from "@/themes/neo/components/empty-state";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { ShareButton } from "@/themes/neo/components/share-button";
import {
  MnStatusBadge,
  MnTypeBadge,
} from "@/themes/neo/components/status-badge";
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

const VOTES_PAGE_SIZE = 10;

function AddressOrDash({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <HashDisplay
      value={value}
      href="/address/$address"
      params={{ address: value }}
    />
  );
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn("relative inline-flex size-2", !active && "opacity-50")}
    >
      {active && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
      )}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          active ? "bg-success" : "bg-destructive",
        )}
      />
    </span>
  );
}

function RolePill({
  icon,
  label,
  accent,
  address,
}: {
  icon: ReactNode;
  label: string;
  accent: string;
  address: string | null | undefined;
}) {
  return (
    <div
      className="relative flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm transition-shadow hover:shadow-sm"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 22%, var(--border))`,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex size-8 items-center justify-center rounded-full"
          style={{
            background: `color-mix(in oklab, ${accent} 16%, transparent)`,
            color: accent,
          }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      {address ? (
        <AddressOrDash value={address} />
      ) : (
        <span className="text-sm text-muted-foreground">Not set</span>
      )}
    </div>
  );
}

function ConsecutivePaymentsStrip({ count }: { count: number }) {
  const slots = 12;
  const filled = Math.min(slots, count);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between text-[11px]">
        <span className="font-medium uppercase tracking-wider text-muted-foreground">
          Consecutive payments
        </span>
        <span className="font-mono tabular-nums">{count.toLocaleString()}</span>
      </div>
      <div className="flex items-end gap-0.5">
        {Array.from({ length: slots }, (_, i) => `bar-${i}`).map((key, i) => {
          const on = i < filled;
          const height = 6 + Math.min(18, i + (on ? 6 : 0));
          return (
            <span
              key={key}
              className={cn(
                "flex-1 rounded-sm transition-colors",
                on ? "bg-accent" : "bg-border",
              )}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function VotingRecord({ proTxHash }: { proTxHash: string }) {
  const network = useStore(appStore, (state) => state.network);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useTableViewMode("masternode-votes");
  const [visibleCount, setVisibleCount] = useState(VOTES_PAGE_SIZE);
  const isInfinite = viewMode === "infinite";
  const { data: votes, isFetching } = useQuery(
    masternodeVotesQueryOptions({ network, hash: proTxHash }),
  );
  const { data: proposals } = useQuery(
    proposalsQueryOptions({ network, proposalType: "all" }),
  );

  const proposalNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of proposals ?? []) {
      if (p.hash && p.name) map.set(p.hash, p.name);
    }
    return map;
  }, [proposals]);

  const sortedVotes = useMemo(
    () =>
      [...(votes ?? [])].sort(
        (a, b) => Date.parse(b.time) - Date.parse(a.time),
      ),
    [votes],
  );
  const tally = useMemo(() => {
    let yes = 0;
    let no = 0;
    let abstain = 0;
    for (const v of sortedVotes) {
      if (v.outcome === "yes") yes += 1;
      else if (v.outcome === "no") no += 1;
      else abstain += 1;
    }
    return { yes, no, abstain };
  }, [sortedVotes]);

  const pagedVotes = useMemo(() => {
    if (isInfinite) return sortedVotes.slice(0, visibleCount);
    return sortedVotes.slice(
      (page - 1) * VOTES_PAGE_SIZE,
      page * VOTES_PAGE_SIZE,
    );
  }, [sortedVotes, page, isInfinite, visibleCount]);
  const hasMoreVotes = visibleCount < sortedVotes.length;

  const columns: DataTableColumn<ApiProposalVote>[] = [
    {
      id: "proposal",
      header: "Proposal",
      cell: (row) => {
        if (!row.proposalHash)
          return <span className="text-muted-foreground">—</span>;
        const name = proposalNames.get(row.proposalHash);
        return (
          <Link
            to="/dao/$hash"
            params={{ hash: row.proposalHash }}
            className="flex min-w-0 flex-col gap-0.5 no-underline"
          >
            <span className="truncate text-sm font-medium text-accent hover:underline">
              {name ??
                `${row.proposalHash.slice(0, 10)}…${row.proposalHash.slice(-6)}`}
            </span>
            {name && (
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {row.proposalHash.slice(0, 10)}…{row.proposalHash.slice(-6)}
              </span>
            )}
          </Link>
        );
      },
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
        <span
          className="whitespace-nowrap text-sm text-muted-foreground"
          title={new Date(row.time).toLocaleString()}
        >
          {formatRelativeTime(row.time)}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Vote className="size-4 text-accent-violet" />
          Governance voting record
        </CardTitle>
        <CardDescription>
          Votes cast by this masternode in the current superblock cycle. The
          record resets when a new cycle begins.
        </CardDescription>
        {sortedVotes.length > 0 && (
          <CardAction>
            <div className="flex items-center gap-1.5">
              <Badge variant="soft-success">
                <ThumbsUp className="size-3" /> {tally.yes}
              </Badge>
              <Badge variant="soft-destructive">
                <ThumbsDown className="size-3" /> {tally.no}
              </Badge>
              <Badge variant="soft">
                <Minus className="size-3" /> {tally.abstain}
              </Badge>
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={pagedVotes}
          isLoading={isFetching && sortedVotes.length === 0}
          rowKey={(row) => `${row.proposalHash}-${row.signal}-${row.time}`}
          emptyTitle="No votes this cycle"
          emptyDescription="This masternode hasn't voted on any active proposal in the current superblock cycle."
          emptyIcon={<Vote className="size-6" />}
          viewMode={{ value: viewMode, onChange: setViewMode }}
          infiniteScroll={{
            hasNextPage: hasMoreVotes,
            isFetchingNextPage: false,
            onLoadMore: () =>
              setVisibleCount((count) => count + VOTES_PAGE_SIZE),
            total: sortedVotes.length,
            loaded: pagedVotes.length,
            skeletonRows: 3,
          }}
          pagination={{
            pageIndex: page,
            pageSize: VOTES_PAGE_SIZE,
            total: sortedVotes.length,
            onPageChange: setPage,
          }}
        />
      </CardContent>
    </Card>
  );
}

interface RedesignMasternodeDetailPageProps {
  hash: string;
}

export default function RedesignMasternodeDetailPage({
  hash,
}: RedesignMasternodeDetailPageProps) {
  const network = useStore(appStore, (state) => state.network);

  const { data: mn, isFetching } = useQuery(
    masternodeQueryOptions({ network, hash }),
  );

  if (isFetching && !mn) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (!mn) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <NotFoundState
          kind="masternode"
          query={hash}
          description="No masternode matched that ProTx hash on the current network. The node may have been removed or you may be on the wrong network."
        />
      </div>
    );
  }

  const isEnabled = mn.status.toUpperCase() === "ENABLED";
  const isClean = (mn.posPenaltyScore ?? 0) === 0;
  const ipHost = getIp(mn.address);

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
                  <Link to="/masternodes" search={{ page: 1, limit: 10 }}>
                    Masternodes
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{mn.proTxHash.slice(0, 10)}…</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <Card variant="floating" className="hero-surface overflow-hidden">
          <CardContent className="flex flex-col gap-6 py-2 lg:flex-row lg:items-center lg:gap-10">
            <div className="flex shrink-0 items-center gap-4">
              <div className="relative">
                <Avatar username={mn.proTxHash} className="size-20" />
                <span className="absolute -right-1 -bottom-1 inline-flex items-center gap-1 rounded-full border border-card bg-card px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm">
                  <LiveDot active={isEnabled} />
                  {isEnabled ? "Live" : "Down"}
                </span>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="soft-accent" className="gap-1.5">
                  <Crown className="size-3" /> Masternode
                </Badge>
                <MnStatusBadge status={mn.status} />
                <MnTypeBadge type={mn.type} />
                {isClean ? (
                  <Badge variant="soft-success" className="gap-1.5">
                    <ShieldCheck className="size-3" /> Clean record
                  </Badge>
                ) : (
                  <Badge variant="soft-destructive" className="gap-1.5">
                    <ShieldAlert className="size-3" /> PoSe {mn.posPenaltyScore}
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-2xl tabular-nums sm:text-3xl">
                {mn.proTxHash.slice(0, 10)}
                <span className="text-muted-foreground">…</span>
                {mn.proTxHash.slice(-6)}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="size-3.5" />
                  <span className="font-mono tabular-nums text-foreground">
                    {ipHost}
                  </span>
                </span>
                <span className="text-border">·</span>
                <span>Registered {formatRelativeTime(mn.createdAt)}</span>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 backdrop-blur-sm">
                <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm">
                  {mn.proTxHash}
                </span>
                <CopyButton value={mn.proTxHash} label="ProTx hash" />
                <ShareButton
                  title={`Masternode ${ipHost}`}
                  text="Dash masternode details"
                  iconOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="size-4 text-accent" />
                Owner & Collateral
              </CardTitle>
              <CardDescription>
                The on-chain identities behind this masternode
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <RolePill
                icon={<Crown className="size-4" />}
                label="Owner"
                accent="var(--accent)"
                address={mn.ownerAddress}
              />
              <RolePill
                icon={<HandCoins className="size-4" />}
                label="Collateral"
                accent="var(--accent-amber)"
                address={mn.collateralAddress}
              />
              <RolePill
                icon={<Vote className="size-4" />}
                label="Voting"
                accent="var(--accent-violet)"
                address={mn.votingAddress}
              />
              <RolePill
                icon={<Send className="size-4" />}
                label="Payout"
                accent="var(--accent-teal)"
                address={mn.payee}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4 text-accent" />
                Payout snapshot
              </CardTitle>
              <CardDescription>
                Recent rewards earned by this node
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Last paid
                </span>
                <span className="font-display text-2xl tabular-nums">
                  {mn.lastPaidTime
                    ? formatRelativeTime(mn.lastPaidTime)
                    : "Never"}
                </span>
                {mn.lastPaidBlock ? (
                  <Link
                    to="/blocks/$hashOrHeight"
                    params={{ hashOrHeight: String(mn.lastPaidBlock) }}
                    className="inline-flex w-fit items-center gap-1 font-mono text-xs text-accent hover:underline"
                  >
                    <Boxes className="size-3" /> Block #
                    {mn.lastPaidBlock.toLocaleString()}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No payout block recorded
                  </span>
                )}
              </div>
              <ConsecutivePaymentsStrip count={mn.consecutivePayments ?? 0} />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 p-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Activity className="size-3" /> PoSe score
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      isClean ? "text-success" : "text-destructive",
                    )}
                  >
                    {mn.posPenaltyScore?.toLocaleString() ?? 0}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/60 p-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Globe2 className="size-3" /> Endpoint
                  </span>
                  <span className="truncate font-mono text-sm font-semibold tabular-nums">
                    {ipHost}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
              <DetailRow label="ProTx Hash">
                <HashDisplay value={mn.proTxHash} variant="full" />
              </DetailRow>
              <DetailRow label="Network Address">
                <span className="flex items-center gap-2 font-mono text-sm">
                  <LiveDot active={isEnabled} />
                  {mn.address}
                </span>
              </DetailRow>
              <DetailRow label="Operator PubKey">
                {mn.pubKeyOperator ? (
                  <HashDisplay value={mn.pubKeyOperator} variant="compact" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="Last Paid">
                {mn.lastPaidTime ? (
                  <>
                    <span>{new Date(mn.lastPaidTime).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatRelativeTime(mn.lastPaidTime)})
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Never</span>
                )}
              </DetailRow>
              <DetailRow label="Registered">
                <span>{new Date(mn.createdAt).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatRelativeTime(mn.createdAt)})
                </span>
              </DetailRow>
              <DetailRow label="Updated">
                <span>{new Date(mn.updatedAt).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatRelativeTime(mn.updatedAt)})
                </span>
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Tabs defaultValue="votes" className="gap-4">
          <TabsList>
            <TabsTrigger value="votes" className="gap-1.5">
              <Vote className="size-3.5" /> Voting record
            </TabsTrigger>
            <TabsTrigger value="blocks" className="gap-1.5">
              <Boxes className="size-3.5" /> Proposed blocks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="votes">
            <VotingRecord proTxHash={mn.proTxHash} />
          </TabsContent>

          <TabsContent value="blocks">
            <EmptyState
              title="No data available"
              description="Masternode block proposal history is not yet exposed by the API."
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
