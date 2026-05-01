import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import { Boxes, Vote } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { DetailRow } from "@/components/detail-row";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import { MnStatusBadge, MnTypeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import { formatRelativeTime } from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";
import { cn } from "@/lib/utils";

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

export const Route = createFileRoute("/masternodes/$hash")({
  component: MasternodeDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `Masternode ${params.hash.slice(0, 12)}... | DashScan` }],
  }),
  loader: async ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    await context.queryClient.prefetchQuery(
      masternodeQueryOptions({ network: defaultNetwork, hash }),
    );
  },
});

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

function MasternodeDetailPage() {
  const { hash } = Route.useParams();
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
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="Masternode not found"
          description="No masternode with that ProTx hash on the current network."
        />
      </div>
    );
  }

  const isEnabled = mn.status.toUpperCase() === "ENABLED";

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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2 min-w-0">
              <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                <Avatar username={mn.proTxHash} className="size-9" />
                <span>Masternode</span>
              </h1>
              <p className="font-mono text-xs sm:text-sm break-all text-muted-foreground">
                {mn.proTxHash}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <MnStatusBadge status={mn.status} />
                <MnTypeBadge type={mn.type} />
              </div>
            </div>
            <CopyButton value={mn.proTxHash} label="ProTx Hash" size="md" />
          </div>
        </header>

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
              <DetailRow label="PoSe Score">
                <Badge
                  variant={
                    mn.posPenaltyScore === 0
                      ? "soft-success"
                      : "soft-destructive"
                  }
                  className="font-mono tabular-nums"
                >
                  {mn.posPenaltyScore}
                </Badge>
              </DetailRow>
              <DetailRow label="Last Paid">
                {mn.lastPaidTime ? (
                  <>
                    <span>
                      {new Date(mn.lastPaidTime * 1000).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatRelativeTime(mn.lastPaidTime)})
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Never</span>
                )}
              </DetailRow>
              <DetailRow label="Last Paid Block">
                {mn.lastPaidBlock ? (
                  <span className="font-mono text-sm tabular-nums">
                    #{mn.lastPaidBlock.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              <DetailRow label="Consecutive Payments">
                {mn.consecutivePayments?.toLocaleString() ?? "0"}
              </DetailRow>
              <DetailRow label="Registered">
                <span>{new Date(mn.createdAt).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatRelativeTime(mn.createdAt)})
                </span>
              </DetailRow>
              <DetailRow label="Owner Address">
                <AddressOrDash value={mn.ownerAddress} />
              </DetailRow>
              <DetailRow label="Voting Address">
                <AddressOrDash value={mn.votingAddress} />
              </DetailRow>
              <DetailRow label="Collateral Address">
                <AddressOrDash value={mn.collateralAddress} />
              </DetailRow>
              <DetailRow label="Payout Address">
                <AddressOrDash value={mn.payee} />
              </DetailRow>
              <DetailRow label="Operator PubKey">
                {mn.pubKeyOperator ? (
                  <HashDisplay value={mn.pubKeyOperator} variant="compact" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Tabs defaultValue="blocks" className="gap-4">
          <TabsList>
            <TabsTrigger value="blocks" className="gap-1.5">
              <Boxes className="size-3.5" /> Proposed Blocks
            </TabsTrigger>
            <TabsTrigger value="votes" className="gap-1.5">
              <Vote className="size-3.5" /> DAO Votes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blocks">
            <EmptyState
              title="No data available"
              description="Masternode block proposal history is not yet exposed by the API."
            />
          </TabsContent>

          <TabsContent value="votes">
            <EmptyState
              title="No data available"
              description="Per-masternode DAO vote history is not yet exposed by the API."
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
