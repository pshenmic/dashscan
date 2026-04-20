import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  Lock,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { AddressLink } from "@/components/address-link";
import { CopyButton } from "@/components/copy-button";
import { HashCell } from "@/components/hash-cell";
import { PageStatus } from "@/components/page-status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { transactionQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction, ApiVIn, ApiVOut } from "@/lib/api/types";
import {
  DUFFS_PER_DASH,
  formatDuffs,
  formatRelativeTime,
  getTxTypeBadgeStyle,
  getTxTypeLabel,
} from "@/lib/format";
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

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

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

function TransactionDetailPage() {
  const { hash } = Route.useParams();
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
  const typeLabel = getTxTypeLabel(tx.type);
  const typeBadgeStyle = getTxTypeBadgeStyle(tx.type);

  const totalInput = sumInputs(tx.vIn);
  const totalOutput = sumOutputs(tx.vOut);
  const fee =
    tx.type === 5 || totalInput == null || totalOutput == null
      ? null
      : Math.max(0, totalInput - totalOutput);

  const hasInputs = tx.vIn && tx.vIn.length > 0;
  const hasOutputs = tx.vOut && tx.vOut.length > 0;

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <h1 className="mb-8 text-4xl tracking-tight animate-fade-in-up">
        Transaction Details
      </h1>

      <div
        className="mb-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0 animate-fade-in-up"
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
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm text-muted-foreground">Transaction Type</p>
              <Badge
                className={`h-7 w-fit whitespace-nowrap border px-3 font-medium ${typeBadgeStyle}`}
              >
                {typeLabel}
              </Badge>
            </div>
          </Card>

          <Card className="border-0 px-6 py-4">
            <div className="flex flex-col">
              <MetaRow label="Transaction Hash">
                <div className="flex min-w-0 items-center gap-1.5">
                  <HashCell hash={tx.hash} />
                  <CopyButton value={tx.hash} />
                </div>
              </MetaRow>
              <MetaRow label="Block">
                {tx.blockHeight != null ? (
                  <div className="flex items-center gap-1.5">
                    <Link
                      to="/blocks/$hashOrHeight"
                      params={{ hashOrHeight: String(tx.blockHeight) }}
                      className="font-mono text-accent hover:underline"
                    >
                      #{tx.blockHeight}
                    </Link>
                    {tx.blockHash ? <CopyButton value={tx.blockHash} /> : null}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Mempool</span>
                )}
              </MetaRow>
              <MetaRow label="Timestamp">
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
              </MetaRow>
              {tx.type === 5 ? (
                <MetaRow label="Block Reward">
                  <AmountValue value={totalOutput} />
                </MetaRow>
              ) : tx.type !== 6 ? (
                <>
                  <MetaRow label="Total Input">
                    <AmountValue value={totalInput} />
                  </MetaRow>
                  <MetaRow label="Total Output">
                    <AmountValue value={totalOutput} />
                  </MetaRow>
                  <MetaRow label="Fee">
                    <AmountValue value={fee} muted />
                  </MetaRow>
                </>
              ) : null}
              {tx.size != null ? (
                <MetaRow label="Size">
                  <span>
                    <span className="font-bold">{tx.size}</span> bytes
                  </span>
                </MetaRow>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="flex flex-col gap-3 border-0 px-6 py-5">
          <h2 className="text-sm text-foreground">Extra Payload</h2>
          <div className="flex flex-col">
            <PayloadRow label="Version">
              <span className="font-bold">{tx.version ?? "—"}</span>
            </PayloadRow>
            <PayloadRow label="Type">
              <span className="font-bold">
                {tx.type} <span className="text-muted-foreground">·</span>{" "}
                {typeLabel}
              </span>
            </PayloadRow>
            {tx.size != null ? (
              <PayloadRow label="Size">
                <span>
                  <span className="font-bold">{tx.size}</span> bytes
                </span>
              </PayloadRow>
            ) : null}
            <PayloadRow label="Confirmations">
              <span className="font-bold">
                {(tx.confirmations ?? 0).toLocaleString()}
              </span>
            </PayloadRow>
            <PayloadRow label="Chain Locked">
              <span className="font-bold">{tx.chainLocked ? "Yes" : "No"}</span>
            </PayloadRow>
            {tx.blockHash ? (
              <PayloadRow label="Block Hash">
                <div className="flex min-w-0 items-center gap-1.5">
                  <HashCell hash={tx.blockHash} />
                  <CopyButton value={tx.blockHash} />
                </div>
              </PayloadRow>
            ) : null}
            {tx.instantLock ? (
              <PayloadRow label="InstantSend Lock">
                <div className="flex min-w-0 items-center gap-1.5">
                  <HashCell hash={tx.instantLock} />
                  <CopyButton value={tx.instantLock} />
                </div>
              </PayloadRow>
            ) : null}
          </div>
        </Card>
      </div>

      <div
        className="grid gap-6 lg:grid-cols-2 animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <IoSection
          title="Inputs"
          icon={ArrowDown}
          count={tx.vIn?.length ?? 0}
          total={totalInput}
        >
          {hasInputs ? (
            <InputsTable vIn={tx.vIn ?? []} />
          ) : (
            <EmptyIo
              message={
                tx.type === 5
                  ? "No inputs (coinbase transaction)."
                  : tx.type === 6
                    ? "Not applicable for quorum commitment."
                    : "No inputs."
              }
            />
          )}
        </IoSection>

        <IoSection
          title="Outputs"
          icon={ArrowUp}
          count={tx.vOut?.length ?? 0}
          total={totalOutput}
        >
          {hasOutputs ? (
            <OutputsTable vOut={tx.vOut ?? []} />
          ) : (
            <EmptyIo
              message={
                tx.type === 6
                  ? "Not applicable for quorum commitment."
                  : "No outputs."
              }
            />
          )}
        </IoSection>
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

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-6 py-3">
      <span className="min-w-24 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center text-xs">{children}</div>
    </div>
  );
}

function PayloadRow({
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
  icon: Icon,
  count,
  total,
  children,
}: {
  title: string;
  icon: IconType;
  count: number;
  total: number | null;
  children: ReactNode;
}) {
  return (
    <Card className="border-0 px-5 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full border border-accent/12 text-accent">
            <Icon className="size-4" />
          </div>
          <h2 className="text-lg">{title}</h2>
          <Badge
            variant="outline"
            className="rounded-full border-border text-xs font-medium"
          >
            {count}
          </Badge>
        </div>
        {total != null ? <DashAmountBadge value={total} /> : null}
      </div>
      {children}
    </Card>
  );
}

function DashAmountBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent/12 px-2.5 py-1 text-xs text-accent">
      <img src="/images/dash-logo.svg" alt="" className="size-3.5" />
      <span className="font-bold">{formatDuffs(value)}</span>
    </span>
  );
}

function InputsTable({ vIn }: { vIn: ApiVIn[] }) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-xs"
        style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}
      >
        <thead>
          <tr>
            <th className="px-3 pb-2 text-left text-muted-foreground">#</th>
            <th className="px-3 pb-2 text-left text-muted-foreground">
              Address
            </th>
            <th className="px-3 pb-2 text-left text-muted-foreground">
              Previous Output
            </th>
            <th className="px-3 pb-2 text-right text-muted-foreground">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {vIn.map((input, idx) => {
            const { prevTxHash } = input;
            return (
              <tr
                key={`${prevTxHash ?? "coinbase"}-${input.vOutIndex ?? idx}`}
                className="group transition-colors"
              >
                <td className="rounded-l-xl bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                  {idx}
                </td>
                <td className="bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                  <AddressLink address={input.address} />
                </td>
                <td className="bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                  {prevTxHash ? (
                    <Link
                      to="/transactions/$hash"
                      params={{ hash: prevTxHash }}
                      className="font-mono text-accent hover:underline"
                    >
                      {prevTxHash.slice(0, 12)}…:{input.vOutIndex ?? 0}
                    </Link>
                  ) : (
                    <span className="font-mono text-muted-foreground">
                      Coinbase
                    </span>
                  )}
                </td>
                <td className="rounded-r-xl bg-secondary/50 px-3 py-2 text-right transition-colors group-hover:bg-accent/10">
                  {input.amount != null ? (
                    <DashAmountBadge value={Number(input.amount)} />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OutputsTable({ vOut }: { vOut: ApiVOut[] }) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-xs"
        style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}
      >
        <thead>
          <tr>
            <th className="px-3 pb-2 text-left text-muted-foreground">#</th>
            <th className="px-3 pb-2 text-left text-muted-foreground">
              Address
            </th>
            <th className="px-3 pb-2 text-left text-muted-foreground">
              Script
            </th>
            <th className="px-3 pb-2 text-right text-muted-foreground">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {vOut.map((output) => (
            <tr key={output.number} className="group transition-colors">
              <td className="rounded-l-xl bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                {output.number}
              </td>
              <td className="bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                <AddressLink address={output.address} />
              </td>
              <td className="max-w-[140px] truncate bg-secondary/50 px-3 py-2 font-mono text-muted-foreground transition-colors group-hover:bg-accent/10">
                {output.scriptPubKeyASM}
              </td>
              <td className="rounded-r-xl bg-secondary/50 px-3 py-2 text-right transition-colors group-hover:bg-accent/10">
                {output.value != null ? (
                  <DashAmountBadge value={output.value} />
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyIo({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
