import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Flame,
  Sparkles,
  Trophy,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { transactionQueryOptions } from "@/lib/api/transactions";
import type { ApiVIn, ApiVOut } from "@/lib/api/types";
import { formatDuffs, formatRelativeTime } from "@/lib/format";
import { appStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/themes/neo/components/copy-button";
import { DetailRow } from "@/themes/neo/components/detail-row";
import { EmptyState, NotFoundState } from "@/themes/neo/components/empty-state";
import { ExtraPayloadSection } from "@/themes/neo/components/extra-payload";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { ShareButton } from "@/themes/neo/components/share-button";
import {
  ChainLockBadge,
  ConfirmationsBadge,
  InstantLockBadge,
  TxTypeBadge,
} from "@/themes/neo/components/status-badge";
import { TransactionFlow } from "@/themes/neo/components/transaction-flow";
import { Badge } from "@/themes/neo/components/ui/badge";
import { Card, CardContent } from "@/themes/neo/components/ui/card";

const RIBBON_PALETTE = [
  "#4c7eff",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#84cc16",
  "#ec4899",
  "#06b6d4",
  "#f43f5e",
];

function paletteFor(index: number) {
  return RIBBON_PALETTE[index % RIBBON_PALETTE.length];
}

function shortAddr(addr: string | null) {
  if (!addr) return "—";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

interface RibbonSegment {
  id: string;
  label: string;
  amount: number;
  color: string;
}

function ValueRibbon({
  segments,
  total,
}: {
  segments: RibbonSegment[];
  total: number;
}) {
  if (total <= 0 || segments.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full ring-1 ring-inset ring-border/60"
        role="img"
        aria-label="Value distribution"
      >
        {segments.map((s) => {
          const pct = (s.amount / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={s.id}
              className="h-full transition-[flex-grow] duration-300"
              style={{
                flexGrow: pct,
                background: `linear-gradient(180deg, ${s.color} 0%, color-mix(in oklab, ${s.color} 78%, black) 100%)`,
                boxShadow: `inset 0 1px 0 hsla(0, 0%, 100%, 0.18)`,
              }}
              title={`${s.label}: ${(s.amount / 1e8).toFixed(8)} DASH`}
            />
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {segments.slice(0, 8).map((s) => {
          const pct = (s.amount / total) * 100;
          return (
            <li key={s.id} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-muted-foreground">
                {s.label}{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {pct.toFixed(pct < 1 ? 2 : 1)}%
                </span>
              </span>
            </li>
          );
        })}
        {segments.length > 8 && (
          <li className="text-muted-foreground">
            + {segments.length - 8} more
          </li>
        )}
      </ul>
    </div>
  );
}

function FeeRewardCallout({
  totalInput,
  totalOutput,
  fee,
}: {
  totalInput: number | null;
  totalOutput: number | null;
  fee: number | null;
}) {
  const showFee = fee != null && fee > 0;
  return (
    <div className="grid gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm sm:grid-cols-3">
      <CalloutCell
        label="Total Input"
        accent="var(--accent)"
        icon={<Coins className="size-4" />}
        value={totalInput}
      />
      <CalloutCell
        label="Total Output"
        accent="var(--success)"
        icon={<ArrowRight className="size-4" />}
        value={totalOutput}
      />
      <CalloutCell
        label="Network Fee"
        accent="var(--accent-amber)"
        icon={<Flame className="size-4" />}
        value={fee}
        muted={!showFee}
      />
    </div>
  );
}

function CalloutCell({
  label,
  accent,
  icon,
  value,
  muted,
}: {
  label: string;
  accent: string;
  icon: React.ReactNode;
  value: number | null;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 transition-shadow",
        !muted && "hover:shadow-sm",
      )}
      style={{
        ["--cell-accent" as string]: accent,
      }}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `color-mix(in oklab, ${accent} 16%, transparent)`,
          color: accent,
        }}
      >
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-sm tabular-nums">
          {value != null ? (
            <>
              {(value / 1e8).toFixed(8)} <DashIcon />
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      </div>
    </div>
  );
}

function CoinbaseRewardPill({ reward }: { reward: number | null }) {
  if (reward == null) return null;
  return (
    <div
      className="relative isolate overflow-hidden rounded-2xl border p-4 sm:p-5"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--accent-amber) 18%, transparent) 0%, color-mix(in oklab, var(--accent) 14%, transparent) 60%, color-mix(in oklab, var(--accent-violet) 10%, transparent) 100%)",
        borderColor:
          "color-mix(in oklab, var(--accent-amber) 38%, var(--border))",
      }}
    >
      <Sparkles
        className="pointer-events-none absolute -right-2 -top-2 size-24 opacity-10"
        style={{ color: "var(--accent-amber)" }}
      />
      <div className="flex items-center gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-amber) 0%, color-mix(in oklab, var(--accent-amber) 70%, black) 100%)",
            boxShadow:
              "0 8px 18px -6px color-mix(in oklab, var(--accent-amber) 50%, transparent)",
          }}
        >
          <Trophy className="size-5 text-white" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Coinbase · Block reward
          </span>
          <span className="font-display text-2xl tabular-nums sm:text-3xl">
            {(reward / 1e8).toFixed(8)} <DashIcon className="inline" />
          </span>
        </div>
      </div>
    </div>
  );
}

function sumInputs(vIn: ApiVIn[] | null | undefined): number | null {
  if (!vIn || vIn.length === 0) return null;
  let total = 0;
  let hasAmount = false;
  for (const input of vIn) {
    if (input.amount == null) continue;
    const num = Number(input.amount);
    if (!Number.isFinite(num)) continue;
    total += num;
    hasAmount = true;
  }
  return hasAmount ? total : null;
}

function sumOutputs(vOut: ApiVOut[] | null | undefined): number | null {
  if (!vOut || vOut.length === 0) return null;
  let total = 0;
  for (const out of vOut) {
    if (out.value != null) total += Number(out.value);
  }
  return total;
}

function DashAmount({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-mono tabular-nums">
      {formatDuffs(value)} <DashIcon />
    </span>
  );
}

interface RedesignTransactionDetailPageProps {
  hash: string;
}

export default function RedesignTransactionDetailPage({
  hash,
}: RedesignTransactionDetailPageProps) {
  const network = useStore(appStore, (state) => state.network);

  const { data: tx, isFetching } = useQuery(
    transactionQueryOptions({ network, hash }),
  );

  if (isFetching && !tx) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }
  if (!tx) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <NotFoundState
          kind="transaction"
          query={hash}
          description="No transaction matched that hash on the current network. It may still be propagating or you may be on the wrong network."
        />
      </div>
    );
  }

  const totalInput = sumInputs(tx.vIn);
  const totalOutput = sumOutputs(tx.vOut);
  const fee =
    tx.type === 5 || totalInput == null || totalOutput == null
      ? null
      : Math.max(0, totalInput - totalOutput);

  const isCoinbase = tx.type === 5;
  const isQuorum = tx.type === 6;
  const hasFlow = (tx.vIn?.length ?? 0) > 0 || (tx.vOut?.length ?? 0) > 0;

  const ribbonSegments: RibbonSegment[] = (tx.vOut ?? [])
    .filter((o) => o.value > 0)
    .map((o, i) => ({
      id: `out-${i}`,
      label: shortAddr(o.address),
      amount: o.value,
      color: paletteFor(i),
    }));
  if (fee != null && fee > 0) {
    ribbonSegments.push({
      id: "fee",
      label: "Fee",
      amount: fee,
      color: "var(--accent-amber)",
    });
  }
  const ribbonTotal = ribbonSegments.reduce((s, x) => s + x.amount, 0);

  const statusBadge =
    tx.confirmations > 0 ? (
      <Badge variant="soft-success">
        <CheckCircle2 className="size-3" /> Confirmed
      </Badge>
    ) : (
      <Badge variant="soft">
        <Clock className="size-3" /> Pending
      </Badge>
    );

  const hasValueData = !isQuorum && (totalInput != null || totalOutput != null);

  const valueDistributionCard = hasValueData ? (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Value distribution
          </h2>
          {fee != null && fee > 0 && (
            <Badge
              variant="outline"
              className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              <Flame className="size-3" />
              Fee {(fee / 1e8).toFixed(8)} <DashIcon />
            </Badge>
          )}
        </div>
        {ribbonTotal > 0 ? (
          <ValueRibbon segments={ribbonSegments} total={ribbonTotal} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No value flow available for this transaction.
          </p>
        )}
        <FeeRewardCallout
          totalInput={totalInput}
          totalOutput={totalOutput}
          fee={fee}
        />
      </CardContent>
    </Card>
  ) : null;

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
                  <Link to="/transactions" search={{ page: 1, limit: 10 }}>
                    Transactions
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{tx.hash.slice(0, 10)}…</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Transaction
              </h1>
              <p className="font-mono text-xs sm:text-sm break-all text-muted-foreground">
                {tx.hash}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {statusBadge}
                <ConfirmationsBadge confirmations={tx.confirmations ?? 0} />
                <ChainLockBadge locked={tx.chainLocked} />
                <InstantLockBadge locked={tx.instantLock} />
                <TxTypeBadge type={tx.type} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CopyButton value={tx.hash} label="Hash" size="md" />
              <ShareButton
                title={`Transaction ${tx.hash.slice(0, 10)}…`}
                text="Dash transaction details"
                iconOnly
              />
            </div>
          </div>
        </header>

        <div
          className={`grid gap-6 ${
            tx.extraPayload ||
            (!isQuorum && (totalInput != null || totalOutput != null))
              ? "lg:grid-cols-2"
              : "lg:grid-cols-1"
          }`}
        >
          <Card>
            <CardContent>
              <section className="flex flex-col gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Summary
                </h2>
                <dl className="grid gap-y-4">
                  <DetailRow label="Hash">
                    <HashDisplay value={tx.hash} variant="full" />
                  </DetailRow>
                  <DetailRow label="Block">
                    {tx.blockHeight != null ? (
                      <Button
                        asChild
                        variant="link"
                        className="h-auto p-0 font-mono"
                      >
                        <Link
                          to="/blocks/$hashOrHeight"
                          params={{
                            hashOrHeight:
                              tx.blockHash ?? String(tx.blockHeight),
                          }}
                        >
                          #{tx.blockHeight.toLocaleString()}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">Mempool</span>
                    )}
                  </DetailRow>
                  <DetailRow label="Timestamp">
                    {tx.timestamp ? (
                      <>
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatRelativeTime(tx.timestamp)}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </DetailRow>
                  <DetailRow label="Confirmations">
                    {(tx.confirmations ?? 0).toLocaleString()}
                  </DetailRow>
                  {isCoinbase ? (
                    <DetailRow label="Block Reward">
                      <DashAmount value={totalOutput} />
                    </DetailRow>
                  ) : isQuorum ? null : (
                    <>
                      <DetailRow label="Total Input">
                        <DashAmount value={totalInput} />
                      </DetailRow>
                      <DetailRow label="Total Output">
                        <DashAmount value={totalOutput} />
                      </DetailRow>
                      <DetailRow label="Fee">
                        <DashAmount value={fee} />
                      </DetailRow>
                    </>
                  )}
                  <DetailRow label="Size">
                    {tx.size != null ? (
                      <span className="font-mono text-sm tabular-nums">
                        {tx.size.toLocaleString()} bytes
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </DetailRow>
                </dl>
              </section>
            </CardContent>
          </Card>

          {tx.extraPayload ? (
            <ExtraPayloadSection txType={tx.type} payload={tx.extraPayload} />
          ) : (
            valueDistributionCard
          )}
        </div>

        {isCoinbase && <CoinbaseRewardPill reward={totalOutput} />}

        {tx.extraPayload ? valueDistributionCard : null}

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Inputs &amp; Outputs{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({tx.vIn?.length ?? 0} → {tx.vOut?.length ?? 0})
            </span>
          </h2>
          {hasFlow ? (
            <TransactionFlow tx={tx} />
          ) : (
            <EmptyState
              title={
                isCoinbase
                  ? "Coinbase transaction"
                  : isQuorum
                    ? "Quorum commitment"
                    : "No inputs or outputs"
              }
              description={
                isCoinbase
                  ? "This transaction creates new coins from a mined block."
                  : isQuorum
                    ? "Quorum commitments do not consume inputs or produce outputs."
                    : undefined
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
