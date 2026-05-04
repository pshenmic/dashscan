import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { CheckCircle2, Clock } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { DashIcon } from "@/components/dash-icon";
import { DetailRow } from "@/components/detail-row";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import {
  ChainLockBadge,
  ConfirmationsBadge,
  InstantLockBadge,
  TxTypeBadge,
} from "@/components/status-badge";
import { TransactionFlow } from "@/components/transaction-flow";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { transactionQueryOptions } from "@/lib/api/transactions";
import type { ApiVIn, ApiVOut } from "@/lib/api/types";
import { formatDuffs, formatRelativeTime, getTxTypeLabel } from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/transactions/$hash")({
  component: TransactionDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `TX ${params.hash.slice(0, 12)}... | DashScan` }],
  }),
  loader: async ({ context, params: { hash } }) => {
    if (typeof window !== "undefined") return;
    await context.queryClient.prefetchQuery(
      transactionQueryOptions({ network: defaultNetwork, hash }),
    );
  },
});

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

function MutedDash() {
  return <span className="text-muted-foreground">—</span>;
}

function HexValue({ value, label }: { value: string; label: string }) {
  const display =
    value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="font-mono text-xs tabular-nums break-all">
        {display}
      </span>
      <CopyButton value={value} label={label} />
    </span>
  );
}

function BoolValue({ value }: { value: boolean | null | undefined }) {
  if (value == null) return <MutedDash />;
  return (
    <Badge variant={value ? "soft-success" : "soft"}>
      {value ? "true" : "false"}
    </Badge>
  );
}

function RawTxFields({
  tx,
}: {
  tx: {
    type: number;
    version: number;
    blockHash: string | null;
    amount: number | null;
    vIn: ApiVIn[] | null | undefined;
    vOut: ApiVOut[] | null | undefined;
    instantLock: boolean | string | null | undefined;
    chainLocked?: boolean | null | undefined;
  };
}) {
  const isCoinbase = tx.type === 5;
  const isQuorum = tx.type === 6;

  const instantLock = tx.instantLock;
  const showInstantLock = !isCoinbase && !isQuorum;
  const showAmount = tx.amount != null;
  const showChainLocked = tx.chainLocked != null;

  return (
    <>
      <DetailRow label="Type">
        <span className="font-mono text-sm tabular-nums">{tx.type}</span>
        <Badge variant="outline" className="text-xs">
          {getTxTypeLabel(tx.type)}
        </Badge>
      </DetailRow>
      <DetailRow label="Version">
        <span className="font-mono text-sm tabular-nums">
          {tx.version ?? "—"}
        </span>
      </DetailRow>
      <DetailRow label="Block Hash">
        {tx.blockHash ? (
          <HashDisplay
            value={tx.blockHash}
            href="/blocks/$hashOrHeight"
            params={{ hashOrHeight: tx.blockHash }}
            head={10}
            tail={8}
          />
        ) : (
          <MutedDash />
        )}
      </DetailRow>
      {isQuorum ? (
        <>
          <DetailRow label="Inputs">
            <span className="text-muted-foreground">None</span>
          </DetailRow>
          <DetailRow label="Outputs">
            <span className="text-muted-foreground">None</span>
          </DetailRow>
        </>
      ) : isCoinbase ? (
        <>
          <DetailRow label="Inputs">
            <Badge variant="soft">Coinbase</Badge>
          </DetailRow>
          <DetailRow label="Outputs">
            <span className="font-mono text-sm tabular-nums">
              {tx.vOut?.length ?? 0}
            </span>
          </DetailRow>
        </>
      ) : (
        <>
          <DetailRow label="Inputs">
            <span className="font-mono text-sm tabular-nums">
              {tx.vIn?.length ?? 0}
            </span>
          </DetailRow>
          <DetailRow label="Outputs">
            <span className="font-mono text-sm tabular-nums">
              {tx.vOut?.length ?? 0}
            </span>
          </DetailRow>
        </>
      )}
      {showAmount && (
        <DetailRow label="Amount">
          <DashAmount value={tx.amount} />
        </DetailRow>
      )}
      {showInstantLock && (
        <DetailRow label="Instant Lock">
          {typeof instantLock === "string" && instantLock.length > 0 ? (
            <HexValue value={instantLock} label="InstantLock signature" />
          ) : (
            <BoolValue value={instantLock as boolean | null | undefined} />
          )}
        </DetailRow>
      )}
      {showChainLocked && (
        <DetailRow label="Chain Locked">
          <BoolValue value={tx.chainLocked} />
        </DetailRow>
      )}
    </>
  );
}

function TransactionDetailPage() {
  const { hash } = Route.useParams();
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
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="Transaction not found"
          description="We couldn't find a transaction with that hash on the current network."
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
            <CopyButton value={tx.hash} label="Hash" size="md" />
          </div>
        </header>

        <Card>
          <CardContent>
            <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
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
                          params={{ hashOrHeight: tx.blockHash }}
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

              <section className="flex flex-col gap-4 lg:border-l lg:border-border/60 lg:pl-12">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Raw Transaction
                </h2>
                <dl className="grid gap-y-4">
                  <RawTxFields tx={tx} />
                </dl>
              </section>
            </div>
          </CardContent>
        </Card>

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
