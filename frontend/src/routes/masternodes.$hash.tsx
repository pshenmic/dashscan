import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import { Bookmark, Check, ChevronDown, Clipboard } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DetailRow } from "@/components/detail-row";
import { HashCell } from "@/components/hash-cell";
import { PageStatus } from "@/components/page-status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { masternodeQueryOptions } from "@/lib/api/masternodes";
import {
  formatRelativeTime,
  getMnStatusBadgeStyle,
  getMnStatusLabel,
  getMnTypeBadgeStyle,
  getMnTypeLabel,
} from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";

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

type Tab = "blocks" | "votes";

function AddressPill({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const head = value.slice(0, 5);
  const tail = value.slice(-5);
  const mid = value.slice(5, -5);
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF0FF] px-3 py-1.5 font-mono text-xs">
      <span className="text-accent">
        <span>{head}</span>
        <span className="text-accent/50">{mid}</span>
        <span>{tail}</span>
      </span>
      <CopyButton value={value} />
    </div>
  );
}

function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex size-2 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`relative cursor-pointer pb-3 text-sm font-semibold transition-colors ${
        active
          ? "text-accent after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-full after:bg-accent"
          : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MasternodeDetailPage() {
  const { hash } = Route.useParams();
  const network = useStore(appStore, (state) => state.network);
  const [activeTab, setActiveTab] = useState<Tab>("blocks");

  const { data: mn, isFetching } = useQuery(
    masternodeQueryOptions({ network, hash }),
  );

  if (isFetching && !mn) {
    return <PageStatus message="Loading masternode..." />;
  }

  if (!mn) {
    return <PageStatus message="Masternode not found." />;
  }

  return (
    <main className="mx-auto max-w-[1440px] overflow-hidden px-6 py-10">
      <h1 className="mb-8 text-4xl tracking-tight animate-fade-in-up">
        <span>Masternode</span>{" "}
        <span className="text-muted-foreground">Info</span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <div
          className="flex flex-col gap-6 animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          <Card className="gap-5 rounded-[24px] border-0 bg-white p-6 shadow-none">
            <div className="flex items-center gap-4 rounded-[20px] px-5 py-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-accent/12 bg-white">
                <Avatar username={mn.proTxHash} className="size-8" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Pro TX Hash:</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm">
                  <HashCell hash={mn.proTxHash} />
                  <CopyButton value={mn.proTxHash} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-[20px] px-5 py-4">
                <div className="flex size-12 items-center justify-center rounded-full border border-accent/12 text-accent">
                  <Check className="size-5" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    className={`mt-1 h-6 font-medium ${getMnStatusBadgeStyle(mn.status)}`}
                  >
                    {getMnStatusLabel(mn.status)}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-[20px] px-5 py-4">
                <div className="flex size-12 items-center justify-center rounded-full border border-accent/12 text-accent">
                  <Bookmark className="size-5" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Node Type</p>
                  <Badge
                    className={`mt-1 h-6 font-medium ${getMnTypeBadgeStyle(mn.type)}`}
                  >
                    {getMnTypeLabel(mn.type)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 px-1">
              <DetailRow label="Collateral TX:">
                <div className="flex items-center gap-1.5">
                  <HashCell hash={mn.proTxHash} accent />
                  <CopyButton value={mn.proTxHash} />
                </div>
              </DetailRow>
              <DetailRow label="Registered:">
                <span className="font-medium">
                  {new Date(mn.createdAt).toLocaleString()}
                </span>
                <Badge
                  variant="outline"
                  className="ml-2 rounded-full border-border text-[10px] font-medium"
                >
                  {formatRelativeTime(mn.createdAt)}
                </Badge>
              </DetailRow>
              <DetailRow label="Last Paid:">
                <span className="font-medium">
                  {mn.lastPaidTime
                    ? new Date(mn.lastPaidTime * 1000).toLocaleString()
                    : "—"}
                </span>
                {mn.lastPaidTime ? (
                  <Badge
                    variant="outline"
                    className="ml-2 rounded-full border-border text-[10px] font-medium"
                  >
                    {formatRelativeTime(mn.lastPaidTime)}
                  </Badge>
                ) : null}
              </DetailRow>
              <DetailRow label="Total Rewards:">
                <span className="text-muted-foreground">—</span>
              </DetailRow>
              <DetailRow label="Core P2P:">
                <span className="font-mono font-medium text-accent">
                  {mn.address}
                </span>
                <LiveDot className="ml-2" />
              </DetailRow>
              <DetailRow label="Platform P2P:">
                <span className="font-mono font-medium text-muted-foreground">
                  —
                </span>
              </DetailRow>
              <DetailRow label="Platform GRPC:">
                <span className="font-mono font-medium text-muted-foreground">
                  —
                </span>
              </DetailRow>

              <DetailRow label="PoSe Score">
                <span className="font-semibold">{mn.posPenaltyScore}</span>
                {mn.posPenaltyScore === 0 ? (
                  <LiveDot className="ml-2" />
                ) : (
                  <span className="ml-2 size-2 rounded-full bg-red-500" />
                )}
              </DetailRow>

              <DetailRow label="Collateral address:">
                <AddressPill value={mn.collateralAddress} />
              </DetailRow>
              <DetailRow label="Owner address:">
                <AddressPill value={mn.ownerAddress} />
              </DetailRow>
              <DetailRow label="Voting address:">
                <AddressPill value={mn.votingAddress} />
              </DetailRow>
              <DetailRow label="Payout address:">
                <AddressPill value={mn.payee} />
              </DetailRow>
            </div>
          </Card>
        </div>

        <div
          className="flex flex-col gap-6 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <Card className="gap-4 rounded-[24px] border-0 bg-white p-6 shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-accent/10">
                  <img src="/images/dash-logo.svg" alt="" className="size-7" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Earned Rewards
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-3xl font-extrabold tracking-tight text-[#10213f]">
                      — <span className="text-muted-foreground">Dash</span>
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#EAF0FF] px-3 text-xs font-medium text-foreground"
              >
                <Clipboard className="size-3.5 text-accent" />1 Month
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </div>
            <div className="flex h-[220px] w-full items-center justify-center rounded-[20px] border border-dashed border-border text-sm text-muted-foreground">
              No rewards data available
            </div>
          </Card>

          <Card className="gap-0 rounded-[24px] border-0 bg-white p-6 shadow-none">
            <div className="mb-4 flex items-center gap-6 border-b border-border">
              <TabButton
                active={activeTab === "blocks"}
                onClick={() => setActiveTab("blocks")}
              >
                Proposed blocks
              </TabButton>
              <TabButton
                active={activeTab === "votes"}
                onClick={() => setActiveTab("votes")}
              >
                DAO Votes
              </TabButton>
            </div>

            <table
              className="w-full text-xs"
              style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}
            >
              <thead>
                <tr>
                  <th className="px-3 pb-2 text-left font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="px-3 pb-2 text-left font-medium text-muted-foreground">
                    Transaction Hash
                  </th>
                  <th className="px-3 pb-2 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-3 pb-2 text-right font-medium text-muted-foreground">
                    Amount{" "}
                    <span className="text-muted-foreground/70">(Fee)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </main>
  );
}
