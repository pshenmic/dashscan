import { skipToken, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import {
  ArrowLeftRight,
  BookKey,
  Box,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { SkeletonBar } from "@/components/skeleton";
import { TwoLineHash } from "@/components/two-line-hash";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { blockQueryOptions } from "@/lib/api/blocks";
import { transactionsByHeightQueryOptions } from "@/lib/api/transactions";
import { formatRelativeTime } from "@/lib/format";
import { getPageCount } from "@/lib/pagination";
import { appStore } from "@/lib/store";

export const Route = createFileRoute("/blocks/$hashOrHeight")({
  component: BlockDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `Block ${params.hashOrHeight} | DashScan` }],
  }),
  loader: async ({ context, params: { hashOrHeight } }) => {
    if (typeof window !== "undefined") return;
    const blockOpts = blockQueryOptions({
      network: "mainnet",
      hash: hashOrHeight,
    });
    await context.queryClient.prefetchQuery(blockOpts);
    const block = context.queryClient.getQueryData(blockOpts.queryKey);
    if (block) {
      await context.queryClient.prefetchQuery(
        transactionsByHeightQueryOptions({
          network: "mainnet",
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
  const [txFilter, setTxFilter] = useState("");
  const [txPage, setTxPage] = useState(1);

  const { data: block, isFetching: isBlockFetching } = useQuery(
    blockQueryOptions({ network, hash: hashOrHeight }),
  );

  const { data: txData, isFetching: isTxFetching } = useQuery(
    block
      ? transactionsByHeightQueryOptions({
          network,
          height: block.height,
          page: txPage,
          limit: 10,
          order: "desc",
        })
      : { queryKey: ["transactionsByHeight"], queryFn: skipToken },
  );

  const transactions = txData?.resultSet ?? [];
  const txPageCount = getPageCount(txData?.pagination);

  const filteredTxs = transactions.filter((tx) =>
    tx.hash.toLowerCase().includes(txFilter.toLowerCase()),
  );

  if (isBlockFetching && !block) {
    return (
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading block...
        </div>
      </main>
    );
  }

  if (!block) {
    return (
      <main className="mx-auto max-w-[1440px] px-6 py-10">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Block not found.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      <div className="mb-8 flex items-center justify-between animate-fade-in-up">
        <h1 className="text-4xl tracking-tight">
          <span className="mr-3 text-muted-foreground">Block</span>{" "}
          <span className="font-mono">
            <span className="text-accent">#</span>
            {block.height}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to="/blocks/$hashOrHeight"
            params={{ hashOrHeight: block.previousBlockHash }}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10"
          >
            <ChevronLeft className="size-4" />
            <span className="text-muted-foreground">{block.height - 1}</span>
          </Link>
          <span className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground/50">
            <span>{block.height + 1}</span>
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>

      <div
        className="mb-6 grid gap-6 lg:grid-cols-[1fr_1fr] animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex flex-col gap-6">
          <Card className="relative overflow-hidden p-5">
            <div
              className="pointer-events-none absolute top-0 left-0 h-full w-1/6"
              style={{
                background:
                  "linear-gradient(to bottom right, oklch(from var(--accent) l c h / 0.25) 0%, transparent 60%)",
              }}
            />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full border border-accent/12 text-accent">
                  <Box className="size-7" />
                </div>
                <p className="text-sm text-muted-foreground">Block Hash:</p>
              </div>
              <div className="flex items-center gap-1.5">
                <TwoLineHash hash={block.hash} />
                <CopyButton value={block.hash} />
              </div>
            </div>
          </Card>

          <Card className="mt-auto px-6 py-4">
            <div className="flex flex-col gap-3">
              <DetailRow label="Timestamp:">
                <span>{new Date(block.timestamp).toLocaleString()}</span>
                <Badge
                  variant="outline"
                  className="ml-2 rounded-full border-border text-xs font-medium"
                >
                  {formatRelativeTime(block.timestamp)}
                </Badge>
              </DetailRow>
              <DetailRow label="Confirmations:">
                <span className="font-medium text-muted-foreground">—</span>
              </DetailRow>
              <DetailRow label="Merkle Root:">
                <div className="flex items-center gap-1.5">
                  <TwoLineHash hash={block.merkleRoot} />
                  <CopyButton value={block.merkleRoot} />
                </div>
              </DetailRow>
              <DetailRow label="Bits:">
                <span className="font-mono font-medium text-muted-foreground">
                  —
                </span>
              </DetailRow>
              <DetailRow label="Nonce:">
                <span className="font-medium">
                  {block.nonce.toLocaleString()}
                </span>
              </DetailRow>
              <DetailRow label="Difficulty:">
                <span className="font-medium">{block.difficulty}</span>
              </DetailRow>
            </div>
          </Card>
        </div>

        <Card className="flex flex-col justify-between p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4 rounded-2xl border border-border px-6 py-[22px]">
              <div className="flex size-14 items-center justify-center rounded-full border border-accent/12 text-accent">
                <BookKey className="size-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <Badge className="mt-1 bg-accent/12 font-bold text-accent">
                  —
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-border px-6 py-[22px]">
              <div className="flex size-14 items-center justify-center rounded-full border border-accent/12 text-accent">
                <ArrowLeftRight className="size-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Transactions
                </p>
                <p className="text-3xl font-extrabold">{block.txCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-border px-6 py-[22px]">
              <div className="flex size-14 items-center justify-center rounded-full border border-accent/12">
                <Avatar username={block.hash} className="size-9" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Mined By:
                </p>
                <p className="text-2xl font-extrabold text-muted-foreground">
                  —
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-border px-6 py-[22px]">
              <div className="flex size-14 items-center justify-center rounded-full border border-accent/12 text-accent">
                <img src="/images/dash-logo.svg" alt="" className="size-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Block Reward
                </p>
                <p className="text-2xl font-extrabold text-muted-foreground">
                  —
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between px-2 text-xs">
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground">Version:</span>
              <span className="text-muted-foreground">Size</span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-medium">{block.version}</span>
              <Badge
                variant="outline"
                className="rounded-full border-border font-medium"
              >
                {block.size.toLocaleString()} bytes
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transactions ({block.txCount})
          </CardTitle>
          <CardAction>
            <SearchInput
              value={txFilter}
              onChange={setTxFilter}
              placeholder="Search by TX Hash..."
            />
          </CardAction>
        </CardHeader>
        <CardContent className="px-3">
          <table
            className="w-full text-xs"
            style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}
          >
            <thead>
              <tr>
                {[
                  { label: "Transaction Hash" },
                  { label: "Type" },
                  { label: "Output", align: "right" },
                  { label: "InstantSend", align: "right" },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`px-3 pb-2 font-medium text-foreground ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isTxFetching && transactions.length === 0 ? (
                Array.from({ length: 5 }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                  <tr key={i}>
                    {["w-44", "w-16", "w-20", "w-20"].map((w, j) => (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
                        key={j}
                        className={`border-y border-border bg-secondary/50 px-3 py-2 ${j === 0 ? "rounded-l-xl border-l" : ""} ${j === 3 ? "rounded-r-xl border-r" : ""}`}
                      >
                        <SkeletonBar className={w} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredTxs.length > 0 ? (
                filteredTxs.map((tx) => (
                  <tr
                    key={tx.hash}
                    className="group cursor-pointer transition-colors"
                  >
                    <td className="rounded-l-xl border-y border-l border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                      <TwoLineHash hash={tx.hash} />
                    </td>
                    <td className="border-y border-border bg-secondary/50 px-3 py-2 transition-colors group-hover:bg-accent/10">
                      <Badge className="h-6 bg-accent/12 font-bold text-accent">
                        {tx.type}
                      </Badge>
                    </td>
                    <td className="border-y border-border bg-secondary/50 px-3 py-2 text-right transition-colors group-hover:bg-accent/10">
                      <span>{(tx.amount / 100_000_000).toFixed(8)} DASH</span>
                    </td>
                    <td className="rounded-r-xl border-y border-r border-border bg-secondary/50 px-3 py-2 text-right transition-colors group-hover:bg-accent/10">
                      {tx.instantLock && (
                        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-white/30 bg-accent pr-3 pl-0.5 text-xs font-medium text-white">
                          <span className="flex size-5 items-center justify-center rounded-full bg-white/12">
                            <Zap className="size-2.5 text-white" />
                          </span>
                          InstantSend
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
        <Pagination
          page={txPage}
          pageCount={txPageCount}
          onPageChange={setTxPage}
        />
      </Card>
    </main>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center text-xs">{children}</div>
    </div>
  );
}
