import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronUp,
  Clock,
  Lock,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { transactionQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction, ApiVIn, ApiVOut } from "@/lib/api/types";
import { DUFFS_PER_DASH, formatDuffs, formatRelativeTime } from "@/lib/format";
import { appStore } from "@/lib/store";
import { AddressLink } from "@/themes/dash/components/address-link";
import { CopyButton } from "@/themes/dash/components/copy-button";
import { ExtraPayloadCard } from "@/themes/dash/components/extra-payload";
import { HashCell } from "@/themes/dash/components/hash-cell";
import { PageStatus } from "@/themes/dash/components/page-status";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const TX_TYPE_SHORT_LABELS: Record<number, string> = {
  0: "Normal",
  1: "Pro Reg Tx",
  2: "Pro Up Serv Tx",
  3: "Pro Up Reg Tx",
  4: "Pro Up Rev Tx",
  5: "Cb Tx",
  6: "Qc Tx",
  7: "Mn Hf Tx",
  8: "Asset Lock",
  9: "Asset Unlock",
};

function getShortTxTypeLabel(type: number): string {
  return TX_TYPE_SHORT_LABELS[type] ?? `Type ${type}`;
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

function deriveStatus(tx: ApiTransaction): {
  label: string;
  tone: "success" | "warning";
  icon: IconType;
} {
  if (tx.chainLocked) {
    return { label: "Chain Locked", tone: "success", icon: Lock };
  }
  if (tx.confirmations && tx.confirmations > 0) {
    return { label: "Confirmed", tone: "success", icon: CheckCircle2 };
  }
  return { label: "Pending", tone: "warning", icon: Clock };
}

function formatDashAmount(value: number | null): string {
  if (value == null) return "—";
  return (value / DUFFS_PER_DASH).toFixed(8);
}

interface ClassicTransactionDetailPageProps {
  hash: string;
}

export default function ClassicTransactionDetailPage({
  hash,
}: ClassicTransactionDetailPageProps) {
  const network = useStore(appStore, (state) => state.network);

  const { data: tx, isFetching } = useQuery(
    transactionQueryOptions({ network, hash }),
  );

  if (isFetching && !tx) {
    return <PageStatus message="Loading transaction..." />;
  }
  if (!tx) {
    return <PageStatus message="Transaction not found." />;
  }

  const status = deriveStatus(tx);
  const StatusIcon = status.icon;
  const typeLabel = getShortTxTypeLabel(tx.type);

  const totalInput = sumInputs(tx.vIn);
  const totalOutput = sumOutputs(tx.vOut);
  const fee =
    tx.type === 5 || totalInput == null || totalOutput == null
      ? null
      : Math.max(0, totalInput - totalOutput);

  const isCoinbase = tx.type === 5;
  const isQuorum = tx.type === 6;

  const hasInputs = !!tx.vIn && tx.vIn.length > 0 && !isCoinbase;
  const hasOutputs = !!tx.vOut && tx.vOut.length > 0;

  const INPUTS_ON_LEFT = new Set([1, 5, 6, 8, 9]);
  const inputsOnLeft = INPUTS_ON_LEFT.has(tx.type);

  const inputsSection = hasInputs ? (
    <IoSection title="Inputs" count={tx.vIn?.length ?? 0}>
      <IoTable
        rows={(tx.vIn ?? []).map((input, idx) => ({
          key: `${input.prevTxHash ?? "coinbase"}-${input.vOutIndex ?? idx}`,
          address: input.address,
          amount: input.amount != null ? Number(input.amount) : null,
        }))}
      />
    </IoSection>
  ) : isCoinbase ? (
    <IoSection title="Inputs" count={1}>
      <CoinbaseRow />
    </IoSection>
  ) : null;

  const outputsSection = hasOutputs ? (
    <IoSection title="Outputs" count={tx.vOut?.length ?? 0}>
      <IoTable
        rows={(tx.vOut ?? []).map((out) => ({
          key: String(out.number),
          address: out.address,
          amount: out.value,
        }))}
      />
    </IoSection>
  ) : null;

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <h1 className="mb-8 text-4xl tracking-tight animate-fade-in-up">
        Transaction <span className="text-muted-foreground">Info</span>
      </h1>

      <div
        className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <IconTile
              icon={StatusIcon}
              label="Status"
              tone={status.tone}
              value={
                <Badge
                  className={
                    status.tone === "success"
                      ? "bg-accent/12 font-bold text-accent"
                      : "bg-amber-500/12 font-bold text-amber-500"
                  }
                >
                  {status.label}
                </Badge>
              }
            />
            <IconTile
              icon={ShieldCheck}
              label="Confirmations"
              value={
                <p className="text-3xl font-extrabold">
                  {(tx.confirmations ?? 0).toLocaleString()}
                </p>
              }
            />
          </div>

          <Card className="flex flex-row items-center gap-6 rounded-2xl border-0 px-5 py-4 sm:px-6 sm:py-[22px]">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-accent/12 text-accent">
              <ArrowLeftRight className="size-7" />
            </div>
            <div className="flex flex-1 items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Transaction Type</p>
              <span className="font-bold">{typeLabel}</span>
            </div>
          </Card>

          <Card className="border-0 px-6 py-4">
            <div className="flex flex-col">
              <DetailRow label="TxID">
                <div className="flex min-w-0 items-center gap-1.5">
                  <HashCell hash={tx.hash} />
                  <CopyButton value={tx.hash} />
                </div>
              </DetailRow>
              <DetailRow label="Block">
                {tx.blockHeight != null ? (
                  <BlockPill
                    height={tx.blockHeight}
                    hash={tx.blockHash ?? undefined}
                  />
                ) : (
                  <span className="text-muted-foreground">Mempool</span>
                )}
              </DetailRow>
              <DetailRow label="Timestamp">
                {tx.timestamp ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{new Date(tx.timestamp).toLocaleString()}</span>
                    <Badge
                      variant="outline"
                      className="rounded-full border-border text-xs font-medium"
                    >
                      {formatRelativeTime(tx.timestamp)}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>
              {isCoinbase ? (
                <DetailRow label="Block Reward">
                  <AmountValue value={totalOutput} />
                </DetailRow>
              ) : isQuorum ? null : (
                <>
                  <DetailRow label="Total Input">
                    <AmountValue value={totalInput} />
                  </DetailRow>
                  <DetailRow label="Total Output">
                    <AmountValue value={totalOutput} />
                  </DetailRow>
                  <DetailRow label="Fee">
                    <AmountValue value={fee} muted />
                  </DetailRow>
                </>
              )}
              {tx.size != null ? (
                <DetailRow label="Size">
                  <span>
                    <span className="font-bold">{tx.size}</span> bytes
                  </span>
                </DetailRow>
              ) : null}
            </div>
          </Card>

          {inputsOnLeft ? inputsSection : null}
        </div>

        <div className="flex flex-col gap-6">
          {tx.extraPayload ? (
            <ExtraPayloadCard txType={tx.type} payload={tx.extraPayload} />
          ) : null}

          {inputsOnLeft ? null : inputsSection}
          {outputsSection}
        </div>
      </div>
    </main>
  );
}

function IconTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: IconType;
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const ringClass =
    tone === "warning"
      ? "border-amber-500/20 text-amber-500"
      : "border-accent/12 text-accent";
  return (
    <Card className="flex flex-row items-center gap-4 rounded-2xl border-0 px-5 py-4 sm:px-6 sm:py-[22px]">
      <div
        className={`flex size-14 shrink-0 items-center justify-center rounded-full border ${ringClass}`}
      >
        <Icon className="size-7" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="mt-1">{value}</div>
      </div>
    </Card>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-6 py-3">
      <span className="min-w-24 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center text-xs">{children}</div>
    </div>
  );
}

function BlockPill({ height, hash }: { height: number; hash?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Link
        to="/blocks/$hashOrHeight"
        params={{ hashOrHeight: String(height) }}
        className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 transition-colors hover:bg-accent/10"
      >
        <span className="font-mono font-bold text-foreground">
          {height.toLocaleString()}
        </span>
      </Link>
      <CopyButton value={hash ?? String(height)} />
    </div>
  );
}

function AmountValue({
  value,
  muted = false,
}: {
  value: number | null;
  muted?: boolean;
}) {
  const amount = formatDashAmount(value);
  return (
    <span className={muted ? "text-muted-foreground" : undefined}>
      <span className="font-bold">{amount}</span>{" "}
      <span className="text-muted-foreground">DASH</span>
    </span>
  );
}

function IoSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Card className="border-0 px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm text-muted-foreground">
          {title} <span className="text-foreground">({count})</span>
        </h2>
        <ChevronUp className="size-4 text-muted-foreground" />
      </div>
      {children}
    </Card>
  );
}

function DashAmountBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent/12 px-2.5 py-1 text-xs text-accent">
      <span className="font-bold">{formatDuffs(value)}</span>
      <img src="/images/dash-logo.svg" alt="" className="size-3.5" />
    </span>
  );
}

interface IoRow {
  key: string;
  address: string | null;
  amount: number | null;
}

function IoTable({ rows }: { rows: IoRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 px-3 text-[11px] text-muted-foreground">
        <span>Address</span>
        <span className="text-right">Amount</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.key}
          className="group flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3 py-2.5 transition-colors hover:bg-accent/10"
        >
          <div className="min-w-0 text-xs">
            <AddressLink address={row.address} />
          </div>
          {row.amount != null ? (
            <DashAmountBadge value={row.amount} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ))}
    </div>
  );
}

function CoinbaseRow() {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground">
      Coinbase (newly generated coins)
    </div>
  );
}
