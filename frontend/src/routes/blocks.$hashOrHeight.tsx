import { skipToken, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ChevronLeft, ChevronRight, FileText, Hash } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import {
  type DescriptionItem,
  DescriptionList,
} from "@/components/description-list";
import { EmptyState } from "@/components/empty-state";
import { HashDisplay } from "@/components/hash-display";
import { PageHeader } from "@/components/page-header";
import { ConfirmationsBadge, TxTypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const items: DescriptionItem[] = [
    {
      label: "Block Hash",
      value: <HashDisplay value={block.hash} variant="full" />,
    },
    {
      label: "Merkle Root",
      value: <HashDisplay value={block.merkleRoot} variant="full" />,
    },
    {
      label: "Previous Block",
      value: (
        <Link
          to="/blocks/$hashOrHeight"
          params={{ hashOrHeight: block.previousBlockHash }}
          className="font-mono text-sm text-accent no-underline hover:underline"
        >
          #{(block.height - 1).toLocaleString()}
        </Link>
      ),
    },
    {
      label: "Timestamp",
      value: (
        <span className="flex flex-wrap items-center gap-2">
          <span>{new Date(block.timestamp).toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(block.timestamp)}
          </span>
        </span>
      ),
    },
    {
      label: "Confirmations",
      value: block.confirmations.toLocaleString(),
    },
    {
      label: "Size",
      value: (
        <span className="font-mono text-sm tabular-nums">
          {(block.size / 1024).toFixed(2)} KB
          <span className="ml-2 text-xs text-muted-foreground">
            ({block.size.toLocaleString()} bytes)
          </span>
        </span>
      ),
    },
    {
      label: "Difficulty",
      value: (
        <span className="font-mono text-sm tabular-nums">
          {block.difficulty.toFixed(4)}
        </span>
      ),
    },
    {
      label: "Nonce",
      value: (
        <span className="font-mono text-sm tabular-nums">
          {block.nonce.toLocaleString()}
        </span>
      ),
    },
    {
      label: "Version",
      value: block.version,
    },
    {
      label: "Credit Pool",
      value: (
        <span className="font-mono text-sm tabular-nums">
          {formatDuffs(block.creditPoolBalance)} DASH
        </span>
      ),
    },
  ];

  const txColumns: DataTableColumn<ApiTransaction>[] = [
    {
      id: "hash",
      header: "Hash",
      cell: (row) => (
        <HashDisplay
          value={row.hash}
          href="/transactions/$hash"
          params={{ hash: row.hash }}
        />
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => <TxTypeBadge type={row.type} />,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-sm tabular-nums">
          {formatDuffs(sumVOut(row.vOut))}{" "}
          <span className="text-muted-foreground">DASH</span>
        </span>
      ),
    },
    {
      id: "confirms",
      header: "Confirmations",
      align: "right",
      cell: (row) => (
        <ConfirmationsBadge confirmations={row.confirmations ?? 0} />
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: "Home", to: "/" },
            { label: "Blocks", to: "/blocks" },
            { label: `#${block.height}` },
          ]}
          title={
            <span>
              <span className="text-muted-foreground">Block</span>{" "}
              <span className="font-mono">
                #{block.height.toLocaleString()}
              </span>
            </span>
          }
          subtitle={
            <span className="font-mono text-xs sm:text-sm">{block.hash}</span>
          }
          actions={
            <div className="flex items-center gap-2">
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
          }
        />

        <Card className="p-6">
          <DescriptionList items={items} />
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
