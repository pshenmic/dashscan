import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
} from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import {
  ChainLockBadge,
  ConfirmationsBadge,
  InstantLockBadge,
  TxTypeBadge,
} from "@/components/status-badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { transactionQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction, ApiVIn, ApiVOut } from "@/lib/api/types";
import {
  DUFFS_PER_DASH,
  formatRelativeTime,
  highlightJson,
} from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="flex flex-wrap items-center gap-2 text-sm">{children}</dd>
    </div>
  );
}

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

function formatDashAmount(value: number | null): string {
  if (value == null) return "—";
  return (value / DUFFS_PER_DASH).toFixed(8);
}

function DashAmount({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-mono tabular-nums">
      {formatDashAmount(value)}{" "}
      <span className="text-muted-foreground">DASH</span>
    </span>
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
  const hasInputs = (tx.vIn?.length ?? 0) > 0;
  const hasOutputs = (tx.vOut?.length ?? 0) > 0;

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
            <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
              <Item label="Hash">
                <HashDisplay value={tx.hash} variant="full" />
              </Item>
              <Item label="Block">
                {tx.blockHeight != null ? (
                  <Link
                    to="/blocks/$hashOrHeight"
                    params={{ hashOrHeight: tx.blockHash }}
                    className="font-mono text-sm text-accent no-underline hover:underline"
                  >
                    #{tx.blockHeight.toLocaleString()}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Mempool</span>
                )}
              </Item>
              <Item label="Timestamp">
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
              </Item>
              <Item label="Confirmations">
                {(tx.confirmations ?? 0).toLocaleString()}
              </Item>
              {isCoinbase ? (
                <Item label="Block Reward">
                  <DashAmount value={totalOutput} />
                </Item>
              ) : isQuorum ? null : (
                <>
                  <Item label="Total Input">
                    <DashAmount value={totalInput} />
                  </Item>
                  <Item label="Total Output">
                    <DashAmount value={totalOutput} />
                  </Item>
                  <Item label="Fee">
                    <DashAmount value={fee} />
                  </Item>
                </>
              )}
              <Item label="Size">
                {tx.size != null ? (
                  <span className="font-mono text-sm tabular-nums">
                    {tx.size.toLocaleString()} bytes
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Item>
              <Item label="Version">{tx.version ?? "—"}</Item>
            </dl>
          </CardContent>
        </Card>

        <Tabs defaultValue="inputs" className="gap-4">
          <TabsList>
            <TabsTrigger value="inputs" className="gap-1.5">
              <ArrowDown className="size-3.5" /> Inputs
              <span className="text-muted-foreground">
                ({tx.vIn?.length ?? 0})
              </span>
            </TabsTrigger>
            <TabsTrigger value="outputs" className="gap-1.5">
              <ArrowUp className="size-3.5" /> Outputs
              <span className="text-muted-foreground">
                ({tx.vOut?.length ?? 0})
              </span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1.5">
              <FileText className="size-3.5" /> Raw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inputs">
            {hasInputs ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Previous Output</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.vIn.map((input, idx) => (
                    <TableRow
                      key={`${input.prevTxHash ?? "coinbase"}-${
                        input.vOutIndex ?? idx
                      }`}
                    >
                      <TableCell className="text-muted-foreground">
                        {idx}
                      </TableCell>
                      <TableCell>
                        {input.address ? (
                          <HashDisplay
                            value={input.address}
                            href="/address/$address"
                            params={{ address: input.address }}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {input.prevTxHash ? (
                          <Link
                            to="/transactions/$hash"
                            params={{ hash: input.prevTxHash }}
                            className="font-mono text-sm text-accent no-underline hover:underline"
                          >
                            {input.prevTxHash.slice(0, 10)}…:
                            {input.vOutIndex ?? 0}
                          </Link>
                        ) : (
                          <Badge variant="soft-accent">
                            <Coins className="size-3" /> Coinbase
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {input.amount != null ? (
                          <DashAmount value={Number(input.amount)} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title={
                  isCoinbase
                    ? "Coinbase transaction"
                    : isQuorum
                      ? "Quorum commitment"
                      : "No inputs"
                }
                description={
                  isCoinbase
                    ? "This transaction creates new coins from a mined block."
                    : isQuorum
                      ? "Quorum commitments do not consume inputs."
                      : undefined
                }
              />
            )}
          </TabsContent>

          <TabsContent value="outputs">
            {hasOutputs ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Script</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.vOut.map((output) => (
                    <TableRow key={output.number}>
                      <TableCell className="text-muted-foreground">
                        {output.number}
                      </TableCell>
                      <TableCell>
                        {output.address ? (
                          <HashDisplay
                            value={output.address}
                            href="/address/$address"
                            params={{ address: output.address }}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate font-mono text-xs text-muted-foreground">
                        {output.scriptPubKeyASM}
                      </TableCell>
                      <TableCell className="text-right">
                        <DashAmount value={output.value} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title={isQuorum ? "Quorum commitment" : "No outputs"}
                description={
                  isQuorum
                    ? "Quorum commitments do not produce outputs."
                    : undefined
                }
              />
            )}
          </TabsContent>

          <TabsContent value="raw">
            <Card className="overflow-hidden p-0">
              <ScrollArea className="h-[480px]">
                <pre
                  className="p-4 font-mono text-xs leading-relaxed"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: highlightJson escapes input
                  dangerouslySetInnerHTML={{
                    __html: highlightJson(tx as ApiTransaction),
                  }}
                />
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
