import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import { Boxes, Vote } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import {
  type DescriptionItem,
  DescriptionList,
} from "@/components/description-list";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import { PageHeader } from "@/components/page-header";
import { MnStatusBadge, MnTypeBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import { formatRelativeTime } from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";
import { cn } from "@/lib/utils";

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

  const items: DescriptionItem[] = [
    {
      label: "ProTx Hash",
      value: <HashDisplay value={mn.proTxHash} variant="full" />,
    },
    {
      label: "Network Address",
      value: (
        <span className="flex items-center gap-2 font-mono text-sm">
          <LiveDot active={isEnabled} />
          {mn.address}
        </span>
      ),
    },
    {
      label: "PoSe Score",
      value: (
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            mn.posPenaltyScore === 0 ? "text-success" : "text-destructive",
          )}
        >
          {mn.posPenaltyScore}
        </span>
      ),
    },
    {
      label: "Last Paid",
      value: mn.lastPaidTime ? (
        <span className="flex flex-wrap items-center gap-2">
          <span>{new Date(mn.lastPaidTime * 1000).toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">
            ({formatRelativeTime(mn.lastPaidTime)})
          </span>
        </span>
      ) : (
        <span className="text-muted-foreground">Never</span>
      ),
    },
    {
      label: "Last Paid Block",
      value: mn.lastPaidBlock ? (
        <span className="font-mono text-sm tabular-nums">
          #{mn.lastPaidBlock.toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      label: "Consecutive Payments",
      value: mn.consecutivePayments?.toLocaleString() ?? "0",
    },
    {
      label: "Registered",
      value: (
        <span className="flex flex-wrap items-center gap-2">
          <span>{new Date(mn.createdAt).toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">
            ({formatRelativeTime(mn.createdAt)})
          </span>
        </span>
      ),
    },
    {
      label: "Owner Address",
      value: mn.ownerAddress ? (
        <HashDisplay
          value={mn.ownerAddress}
          href="/address/$address"
          params={{ address: mn.ownerAddress }}
        />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      label: "Voting Address",
      value: mn.votingAddress ? (
        <HashDisplay
          value={mn.votingAddress}
          href="/address/$address"
          params={{ address: mn.votingAddress }}
        />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      label: "Collateral Address",
      value: mn.collateralAddress ? (
        <HashDisplay
          value={mn.collateralAddress}
          href="/address/$address"
          params={{ address: mn.collateralAddress }}
        />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      label: "Payout Address",
      value: mn.payee ? (
        <HashDisplay
          value={mn.payee}
          href="/address/$address"
          params={{ address: mn.payee }}
        />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      label: "Operator PubKey",
      value: mn.pubKeyOperator ? (
        <HashDisplay value={mn.pubKeyOperator} variant="compact" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: "Home", to: "/" },
            { label: "Masternodes", to: "/masternodes" },
            { label: `${mn.proTxHash.slice(0, 10)}…` },
          ]}
          title={
            <span className="flex items-center gap-3">
              <Avatar username={mn.proTxHash} className="size-9" />
              <span>Masternode</span>
            </span>
          }
          subtitle={
            <span className="font-mono text-xs sm:text-sm">{mn.proTxHash}</span>
          }
          actions={
            <CopyButton value={mn.proTxHash} label="ProTx Hash" size="md" />
          }
          badges={
            <>
              <MnStatusBadge status={mn.status} />
              <MnTypeBadge type={mn.type} />
            </>
          }
        />

        <Card className="p-6">
          <DescriptionList items={items} />
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
            <Card className="overflow-hidden p-0">
              <EmptyState
                title="No data available"
                description="Masternode block proposal history is not yet exposed by the API."
              />
            </Card>
          </TabsContent>

          <TabsContent value="votes">
            <Card className="overflow-hidden p-0">
              <EmptyState
                title="No data available"
                description="Per-masternode DAO vote history is not yet exposed by the API."
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
