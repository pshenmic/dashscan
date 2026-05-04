import { skipToken, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowLeftRight,
  ArrowRightFromLine,
  ArrowRightToLine,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  HardDrive,
  Hash,
  Layers,
} from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DashIcon } from "@/components/dash-icon";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DetailRow } from "@/components/detail-row";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import {
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { blockQueryOptions } from "@/lib/api/blocks";
import { transactionsByHeightQueryOptions } from "@/lib/api/transactions";
import type { ApiTransaction } from "@/lib/api/types";
import {
  formatDuffs,
  formatRelativeTime,
  highlightJson,
  sumVOut,
} from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/blocks/$hashOrHeight")({
  component: BlockDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `Block ${params.hashOrHeight} | DashScan` }],
  }),
  loader: async ({ context, params: { hashOrHeight } }) => {
    if (typeof window !== "undefined") return;
    const blockOpts = blockQueryOptions({
      network: defaultNetwork,
      hash: hashOrHeight,
    });
    await context.queryClient.prefetchQuery(blockOpts);
    const block = context.queryClient.getQueryData(blockOpts.queryKey);
    if (block) {
      await context.queryClient.prefetchQuery(
        transactionsByHeightQueryOptions({
          network: defaultNetwork,
          height: block.height,
          page: 1,
          limit: 10,
          order: "desc",
        }),
      );
    }
  },
});

function BlockDetailPage() {
  const { hashOrHeight } = Route.useParams();
  const network = useStore(appStore, (state) => state.network);
  const navigate = useNavigate();
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);

  const { data: block, isFetching: isBlockFetching } = useQuery(
    blockQueryOptions({ network, hash: hashOrHeight }),
  );

  const { data: txData, isFetching: isTxFetching } = useQuery(
    block
      ? transactionsByHeightQueryOptions({
          network,
          height: block.height,
          page: txPage,
          limit: txLimit,
          order: "desc",
        })
      : { queryKey: ["transactionsByHeight"], queryFn: skipToken },
  );

  if (isBlockFetching && !block) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (!block) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="Block not found"
          description="We couldn't find a block with that hash or height."
        />
      </div>
    );
  }

  const transactions = txData?.resultSet ?? [];
  const total = txData?.pagination?.total ?? block.txCount ?? 0;

  const txColumns: DataTableColumn<ApiTransaction>[] = [
    {
      id: "hash",
      header: "Transaction",
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
            <ArrowLeftRight className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <HashDisplay
              value={row.hash}
              href="/transactions/$hash"
              params={{ hash: row.hash }}
              copy={false}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <TxTypeBadge type={row.type} />
              <InstantLockBadge locked={row.instantLock} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="soft" className="font-mono">
                    <ArrowRightToLine className="size-3" />
                    {row.vIn?.length ?? 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {row.vIn?.length ?? 0} input
                  {(row.vIn?.length ?? 0) === 1 ? "" : "s"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="soft" className="font-mono">
                    <ArrowRightFromLine className="size-3" />
                    {row.vOut?.length ?? 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {row.vOut?.length ?? 0} output
                  {(row.vOut?.length ?? 0) === 1 ? "" : "s"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "confirms",
      header: "Confirms",
      align: "right",
      cell: (row) => (
        <ConfirmationsBadge confirmations={row.confirmations ?? 0} />
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm font-medium tabular-nums text-accent">
          {formatDuffs(sumVOut(row.vOut))} <DashIcon />
        </span>
      ),
    },
  ];

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
                  <Link to="/blocks" search={{ page: 1, limit: 10 }}>
                    Blocks
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>#{block.height}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2 min-w-0">
              <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                <span className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Layers className="size-4" />
                </span>
                <span className="text-muted-foreground">Block</span>
                <span className="font-mono">
                  #{block.height.toLocaleString()}
                </span>
              </h1>
              <p className="font-mono text-xs sm:text-sm break-all text-muted-foreground">
                {block.hash}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton value={block.hash} label="Hash" size="md" />
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/blocks/$hashOrHeight"
                  params={{ hashOrHeight: block.previousBlockHash }}
                >
                  <ChevronLeft className="size-4" /> Prev
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={block.confirmations <= 1}
                onClick={() =>
                  navigate({
                    to: "/blocks/$hashOrHeight",
                    params: { hashOrHeight: String(block.height + 1) },
                  })
                }
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Transactions</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {block.txCount.toLocaleString()}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <ArrowLeftRight className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Size</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {(block.size / 1024).toFixed(2)}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  KB
                </span>
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <HardDrive className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Difficulty</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {block.difficulty.toFixed(4)}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-accent/12 [&_svg]:text-accent">
                  <Gauge className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Confirmations</CardDescription>
              <CardTitle className="text-2xl tabular-nums text-accent">
                {block.confirmations.toLocaleString()}
              </CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-full bg-success/12 [&_svg]:text-success">
                  <CheckCircle2 className="size-4" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3" />
                {formatRelativeTime(block.timestamp)}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <dl className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
              <DetailRow label="Block Hash">
                <HashDisplay value={block.hash} variant="full" />
              </DetailRow>
              <DetailRow label="Merkle Root">
                <HashDisplay value={block.merkleRoot} variant="full" />
              </DetailRow>
              <DetailRow label="Previous Block">
                <Button asChild variant="link" className="h-auto p-0 font-mono">
                  <Link
                    to="/blocks/$hashOrHeight"
                    params={{ hashOrHeight: block.previousBlockHash }}
                  >
                    #{(block.height - 1).toLocaleString()}
                  </Link>
                </Button>
              </DetailRow>
              <DetailRow label="Timestamp">
                <span>{new Date(block.timestamp).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(block.timestamp)}
                </span>
              </DetailRow>
              <DetailRow label="Confirmations">
                {block.confirmations.toLocaleString()}
              </DetailRow>
              <DetailRow label="Size">
                <span className="font-mono tabular-nums">
                  {(block.size / 1024).toFixed(2)} KB
                </span>
                <span className="text-xs text-muted-foreground">
                  ({block.size.toLocaleString()} bytes)
                </span>
              </DetailRow>
              <DetailRow label="Difficulty">
                <span className="font-mono tabular-nums">
                  {block.difficulty.toFixed(4)}
                </span>
              </DetailRow>
              <DetailRow label="Nonce">
                <span className="font-mono tabular-nums">
                  {block.nonce.toLocaleString()}
                </span>
              </DetailRow>
              <DetailRow label="Version">{block.version}</DetailRow>
              <DetailRow label="Credit Pool">
                <span className="font-mono tabular-nums">
                  {formatDuffs(block.creditPoolBalance)} <DashIcon />
                </span>
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Tabs defaultValue="transactions" className="gap-4">
          <TabsList>
            <TabsTrigger value="transactions" className="gap-1.5">
              <Hash className="size-3.5" /> Transactions
              <span className="text-muted-foreground">
                ({block.txCount.toLocaleString()})
              </span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1.5">
              <FileText className="size-3.5" /> Raw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <DataTable
              columns={txColumns}
              data={transactions}
              isLoading={isTxFetching}
              rowKey={(row) => row.hash}
              onRowClick={(tx) =>
                navigate({
                  to: "/transactions/$hash",
                  params: { hash: tx.hash },
                })
              }
              emptyTitle="No transactions"
              pagination={{
                pageIndex: txPage,
                pageSize: txLimit,
                total,
                onPageChange: setTxPage,
                onPageSizeChange: (size) => {
                  setTxLimit(size);
                  setTxPage(1);
                },
              }}
            />
          </TabsContent>

          <TabsContent value="raw">
            <Card className="overflow-hidden p-0">
              <ScrollArea className="h-[480px]">
                <pre
                  className="p-4 font-mono text-xs leading-relaxed"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: highlightJson escapes input
                  dangerouslySetInnerHTML={{ __html: highlightJson(block) }}
                />
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
