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
import { CopyButton } from "@/components/copy-button";
import {
  type DescriptionItem,
  DescriptionList,
} from "@/components/description-list";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import { PageHeader } from "@/components/page-header";
import {
  ChainLockBadge,
  ConfirmationsBadge,
  InstantLockBadge,
  TxTypeBadge,
} from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

  const items: DescriptionItem[] = [
    {
      label: "Hash",
      value: <HashDisplay value={tx.hash} variant="full" />,
    },
    {
      label: "Block",
      value:
        tx.blockHeight != null ? (
          <Link
            to="/blocks/$hashOrHeight"
            params={{ hashOrHeight: tx.blockHash }}
            className="font-mono text-sm text-accent no-underline hover:underline"
          >
            #{tx.blockHeight.toLocaleString()}
          </Link>
        ) : (
          <span className="text-muted-foreground">Mempool</span>
        ),
    },
    {
      label: "Timestamp",
      value: tx.timestamp ? (
        <span className="flex flex-wrap items-center gap-2">
          <span>{new Date(tx.timestamp).toLocaleString()}</span>
          <Badge variant="outline" className="text-xs">
            {formatRelativeTime(tx.timestamp)}
          </Badge>
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      label: "Confirmations",
      value: (tx.confirmations ?? 0).toLocaleString(),
    },
    ...(isCoinbase
      ? [
          {
            label: "Block Reward",
            value: <DashAmount value={totalOutput} />,
          },
        ]
      : isQuorum
        ? []
        : [
            {
              label: "Total Input",
              value: <DashAmount value={totalInput} />,
            },
            {
              label: "Total Output",
              value: <DashAmount value={totalOutput} />,
            },
            {
              label: "Fee",
              value: <DashAmount value={fee} />,
            },
          ]),
    {
      label: "Size",
      value:
        tx.size != null ? (
          <span className="font-mono text-sm tabular-nums">
            {tx.size.toLocaleString()} bytes
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      label: "Version",
      value: tx.version ?? "—",
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: "Home", to: "/" },
            { label: "Transactions", to: "/transactions" },
            { label: `${tx.hash.slice(0, 10)}…` },
          ]}
          title="Transaction"
          subtitle={
            <span className="font-mono text-xs sm:text-sm">{tx.hash}</span>
          }
          actions={<CopyButton value={tx.hash} label="Hash" size="md" />}
          badges={
            <>
              {statusBadge}
              <ConfirmationsBadge confirmations={tx.confirmations ?? 0} />
              <ChainLockBadge locked={tx.chainLocked} />
              <InstantLockBadge locked={tx.instantLock} />
              <TxTypeBadge type={tx.type} />
            </>
          }
        />

        <Card className="p-6">
          <DescriptionList items={items} />
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
            <Card className="overflow-hidden p-0">
              {hasInputs ? (
                <Table>
                  <TableHeader className="bg-secondary/50">
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
            </Card>
          </TabsContent>

          <TabsContent value="outputs">
            <Card className="overflow-hidden p-0">
              {hasOutputs ? (
                <Table>
                  <TableHeader className="bg-secondary/50">
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
            </Card>
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
