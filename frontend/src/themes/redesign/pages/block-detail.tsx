import { skipToken, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
  ArrowLeftRight,
  ArrowRightFromLine,
  ArrowRightToLine,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  HardDrive,
  Hash,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { appStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/themes/redesign/components/copy-button";
import {
  DataTable,
  type DataTableColumn,
} from "@/themes/redesign/components/data-table";
import { DetailRow } from "@/themes/redesign/components/detail-row";
import { NotFoundState } from "@/themes/redesign/components/empty-state";
import { HashDisplay } from "@/themes/redesign/components/hash-display";
import { ShareButton } from "@/themes/redesign/components/share-button";
import {
  ConfirmationsBadge,
  InstantLockBadge,
  TxTypeBadge,
} from "@/themes/redesign/components/status-badge";
import { Badge } from "@/themes/redesign/components/ui/badge";
import { Card, CardContent } from "@/themes/redesign/components/ui/card";

const FINALITY_CONFIRMS = 6;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatAge(diffMs: number): string {
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}m ${remSec.toString().padStart(2, "0")}s`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  if (hr < 24) return `${hr}h ${remMin}m`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h`;
}

function IsometricBlockCube({ height }: { height: number }) {
  const SIZE = 140;
  const half = SIZE / 2;
  return (
    <div
      className="iso-stage relative flex shrink-0 items-center justify-center"
      style={{ width: SIZE + 96, height: SIZE + 96 }}
    >
      <div className="iso-cube" style={{ width: SIZE, height: SIZE }}>
        <div
          className="iso-face iso-face--top"
          style={{
            transform: `rotateX(90deg) translateZ(${half}px)`,
          }}
        />
        <div
          className="iso-face iso-face--right"
          style={{
            transform: `rotateY(90deg) translateZ(${half}px)`,
          }}
        />
        <div
          className="iso-face iso-face--front flex items-center justify-center px-3"
          style={{ transform: `translateZ(${half}px)` }}
        >
          <div className="flex flex-col items-center gap-1 text-white">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] opacity-80">
              Block
            </span>
            <span className="font-display text-xl leading-none tabular-nums">
              #{height.toLocaleString()}
            </span>
          </div>
        </div>
        <span className="iso-cube__halo" />
      </div>
    </div>
  );
}

function ConfirmationBar({ confirmations }: { confirmations: number }) {
  const ratio = Math.min(1, confirmations / FINALITY_CONFIRMS);
  const final = confirmations >= FINALITY_CONFIRMS;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          Confirmation depth
        </span>
        <span
          className={cn(
            "font-mono tabular-nums",
            final ? "text-success" : "text-accent",
          )}
        >
          {confirmations.toLocaleString()} /{" "}
          <span className="text-muted-foreground">{FINALITY_CONFIRMS}+</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: FINALITY_CONFIRMS }, (_, i) => `slot-${i}`).map(
          (key, i) => {
            const filled = i < confirmations;
            return (
              <span
                key={key}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  filled ? (final ? "bg-success" : "bg-accent") : "bg-border",
                )}
              />
            );
          },
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Just mined</span>
        <span className="inline-flex items-center gap-1.5">
          {final ? (
            <>
              <ShieldCheck className="size-3 text-success" />
              <span className="text-success font-medium">Finalized</span>
            </>
          ) : (
            <>{Math.round(ratio * 100)}% to finality</>
          )}
        </span>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/12 [&_svg]:size-4 [&_svg]:text-accent">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {value}
          {unit && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

interface RedesignBlockDetailPageProps {
  hashOrHeight: string;
}

export default function RedesignBlockDetailPage({
  hashOrHeight,
}: RedesignBlockDetailPageProps) {
  const network = useStore(appStore, (state) => state.network);
  const navigate = useNavigate();
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);
  const now = useNow();

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
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <NotFoundState
          kind="block"
          query={hashOrHeight}
          description="No block matched that hash or height on the current network. Double-check the value or try recent blocks."
        />
      </div>
    );
  }

  const transactions = txData?.resultSet ?? [];
  const total = txData?.pagination?.total ?? block.txCount ?? 0;
  const age = formatAge(now - new Date(block.timestamp).getTime());

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
          <div className="flex flex-wrap items-center justify-end gap-2">
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
        </header>

        <Card variant="floating" className="hero-surface overflow-hidden">
          <CardContent className="flex flex-col gap-6 py-2 lg:flex-row lg:items-center lg:gap-10">
            <IsometricBlockCube height={block.height} />
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="soft-accent" className="gap-1.5">
                    <Layers className="size-3" /> Block
                  </Badge>
                  {block.confirmations >= FINALITY_CONFIRMS ? (
                    <Badge variant="soft-success" className="gap-1.5">
                      <ShieldCheck className="size-3" /> Finalized
                    </Badge>
                  ) : (
                    <Badge variant="soft" className="gap-1.5">
                      <Clock className="size-3" /> Maturing
                    </Badge>
                  )}
                </div>
                <h1 className="font-display text-4xl leading-none sm:text-5xl">
                  #{block.height.toLocaleString()}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span className="font-mono tabular-nums text-foreground">
                      {age}
                    </span>{" "}
                    old
                  </span>
                  <span className="text-border">·</span>
                  <span>{new Date(block.timestamp).toLocaleString()}</span>
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 backdrop-blur-sm">
                  <Hash className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm">
                    {block.hash}
                  </span>
                  <CopyButton value={block.hash} label="Hash" />
                  <ShareButton
                    title={`Block #${block.height}`}
                    text={`Dash block #${block.height} · ${block.txCount} tx`}
                    iconOnly
                  />
                </div>
              </div>
              <ConfirmationBar confirmations={block.confirmations} />
              <div className="grid gap-3 sm:grid-cols-3">
                <HeroStat
                  label="Transactions"
                  value={block.txCount.toLocaleString()}
                  icon={<ArrowLeftRight />}
                />
                <HeroStat
                  label="Size"
                  value={(block.size / 1024).toFixed(2)}
                  unit="KB"
                  icon={<HardDrive />}
                />
                <HeroStat
                  label="Difficulty"
                  value={block.difficulty.toFixed(2)}
                  icon={<Gauge />}
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
