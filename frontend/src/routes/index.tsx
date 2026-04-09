import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";

import { Avatar } from "dash-ui-kit/react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Box,
  MoveDown,
  MoveUp,
} from "lucide-react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { FadeInSection } from "@/components/fade-in-section";
import { PriceChart } from "@/components/price-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { blocksQueryOptions } from "@/lib/api/blocks";
import {
  marketCapHistoricalQueryOptions,
  marketCapQueryOptions,
} from "@/lib/api/marketcap";
import { masternodesQueryOptions } from "@/lib/api/masternodes";

import {
  priceHistoricalQueryOptions,
  priceQueryOptions,
} from "@/lib/api/price";
import { transactionHistoryQueryOptions } from "@/lib/api/transaction-history";
import { transactionsQueryOptions } from "@/lib/api/transactions";
import { volumeHistoricalQueryOptions } from "@/lib/api/volume";
import { formatCompactUsd, formatDash, formatRelativeTime } from "@/lib/format";
import { appStore, defaultNetwork } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "Dashboard | DashScan" }],
  }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    const network = defaultNetwork;
    return Promise.all([
      context.queryClient.prefetchQuery(
        blocksQueryOptions({ network, page: 1, limit: 5, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionsQueryOptions({ network, page: 1, limit: 4, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        masternodesQueryOptions({ network, page: 1, limit: 5, order: "desc" }),
      ),
      context.queryClient.prefetchQuery(
        transactionHistoryQueryOptions({ network }),
      ),
      context.queryClient.prefetchQuery(
        priceQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        priceQueryOptions({ network, currency: "btc" }),
      ),
      context.queryClient.prefetchQuery(
        priceHistoricalQueryOptions({ network, currency: "usd" }),
      ),
      context.queryClient.prefetchQuery(
        marketCapQueryOptions({ network, currency: "usd" }),
      ),
    ]);
  },
});

function Dashboard() {
  const network = useStore(appStore, (state) => state.network);
  const [chartMetric, setChartMetric] = useState<"price" | "volume" | "mcap">(
    "price",
  );
  const [priceCurrency, setPriceCurrency] = useState<"usd" | "btc">("usd");

  const { data: blocksData } = useQuery(
    blocksQueryOptions({ network, page: 1, limit: 5, order: "desc" }),
  );
  const { data: txData } = useQuery(
    transactionsQueryOptions({ network, page: 1, limit: 4, order: "desc" }),
  );
  const { data: mnData } = useQuery(
    masternodesQueryOptions({ network, page: 1, limit: 5, order: "desc" }),
  );
  const { data: txHistory } = useQuery(
    transactionHistoryQueryOptions({ network }),
  );
  const { data: usdPrice } = useQuery(
    priceQueryOptions({ network, currency: "usd" }),
  );
  const { data: btcPrice } = useQuery(
    priceQueryOptions({ network, currency: "btc" }),
  );
  const { data: priceHistory } = useQuery(
    priceHistoricalQueryOptions({ network, currency: priceCurrency }),
  );
  const { data: volumeHistory } = useQuery(
    volumeHistoricalQueryOptions({ network, currency: priceCurrency }),
  );
  const { data: mcapHistory } = useQuery(
    marketCapHistoricalQueryOptions({ network, currency: priceCurrency }),
  );
  const { data: marketCap } = useQuery(
    marketCapQueryOptions({ network, currency: "usd" }),
  );

  const fullTxHistory = (() => {
    if (!txHistory) return undefined;
    const now = new Date();
    const hourMap = new Map(
      txHistory.map((e) => {
        const d = new Date(e.timestamp * 1000);
        return [d.getHours(), e];
      }),
    );
    return Array.from({ length: 20 }, (_, i) => {
      const d = new Date(now);
      d.setHours(now.getHours() - 19 + i, 0, 0, 0);
      const hour = d.getHours();
      return (
        hourMap.get(hour) ?? {
          timestamp: Math.floor(d.getTime() / 1000),
          count: 0,
        }
      );
    });
  })();

  const totalTxs =
    fullTxHistory?.reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const txHistoryChartData = fullTxHistory?.map((e) => ({
    timestamp: e.timestamp,
    value: e.count,
  }));

  const currentPrice = priceCurrency === "usd" ? usdPrice?.usd : btcPrice?.btc;
  const chartHistory =
    chartMetric === "volume"
      ? volumeHistory
      : chartMetric === "mcap"
        ? mcapHistory
        : priceHistory;
  const chartChange =
    chartHistory && chartHistory.length >= 2
      ? ((chartHistory[chartHistory.length - 1].value - chartHistory[0].value) /
          chartHistory[0].value) *
        100
      : null;

  return (
    <main className="mx-auto max-w-[1440px] overflow-hidden px-6 py-10">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Welcome to #1</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-accent">Dash</span> Blockchain Explorer
        </h1>
      </div>

      <div
        className="mb-6 grid gap-6 lg:grid-cols-3 animate-fade-in-up [&>*]:min-w-0"
        style={{ animationDelay: "100ms" }}
      >
        <Card
          className="border-0"
          style={{
            background:
              "radial-gradient(circle at top right, oklch(from var(--accent) l c h / 0.05), var(--color-card) 70%)",
          }}
        >
          <CardHeader>
            <CardTitle>Transactions history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <AnimatedNumber
                value={totalTxs}
                className="text-4xl font-extrabold"
              />
              <span className="text-sm font-medium text-muted-foreground">
                TXS (20h)
              </span>
            </div>
            {txHistoryChartData && txHistoryChartData.length > 0 ? (
              <div className="mt-auto">
                <PriceChart
                  data={txHistoryChartData}
                  formatValue={(v) => `${Math.round(v)} txs`}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transactions
            </CardTitle>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                className="h-auto rounded-full px-[18px] py-3"
                asChild
              >
                <Link to="/transactions" search={{ page: 1 }}>
                  See All
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {txData?.resultSet.map((tx) => (
              <Link
                key={tx.hash}
                to="/transactions/$hash"
                params={{ hash: tx.hash }}
                className="-mx-3 flex items-center justify-between rounded-xl px-3 py-2 transition-colors duration-100 hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full border border-accent/12 text-accent">
                    <ArrowLeftRight className="size-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-sm font-medium">
                      {tx.hash.slice(0, 7)}...{tx.hash.slice(-7)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="gap-1 rounded-full border-border/60 bg-transparent px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        <ArrowDown className="size-3" />
                        {tx.vIn?.length ?? "—"} Inputs
                      </Badge>
                      <Badge
                        variant="outline"
                        className="gap-1 rounded-full border-border/60 bg-transparent px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        <ArrowUp className="size-3" />
                        {tx.vOut?.length ?? "—"} Outputs
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatDash(tx.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.timestamp ? formatRelativeTime(tx.timestamp) : ""}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blocks
            </CardTitle>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                className="h-auto rounded-full px-[18px] py-3"
                asChild
              >
                <Link to="/blocks" search={{ page: 1 }}>
                  See All
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {blocksData?.resultSet.map((block) => (
              <Link
                key={block.hash}
                to="/blocks/$hashOrHeight"
                params={{ hashOrHeight: block.hash }}
                className="-mx-3 flex items-center justify-between rounded-xl px-3 py-2 transition-colors duration-100 hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full border border-accent/12 text-accent">
                    <Box className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">#{block.height}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {block.hash.slice(0, 6)}...{block.hash.slice(-5)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{block.txCount} TXS</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(block.timestamp)}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <FadeInSection
        className="grid gap-6 lg:grid-cols-[1fr_auto_2fr] [&>*]:min-w-0"
        delay={200}
      >
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Masternodes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mnData?.resultSet.map((mn) => (
              <div
                key={mn.proTxHash}
                className="-mx-3 flex items-center justify-between rounded-xl px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full border border-accent/12">
                    <Avatar username={mn.proTxHash} className="size-5" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium">
                      {mn.proTxHash.slice(0, 6)}...{mn.proTxHash.slice(-5)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {mn.address}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {mn.status === "ENABLED" ? (
                      <span className="relative inline-flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                      </span>
                    ) : (
                      <span className="inline-flex size-2 rounded-full bg-red-500" />
                    )}
                    <p className="text-sm font-bold">
                      {mn.status.charAt(0) + mn.status.slice(1).toLowerCase()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{mn.type}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="flex-1 border-0">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Market Cap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold">
                {marketCap?.usd ? formatCompactUsd(marketCap.usd) : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="flex-1 border-0">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                BTC price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold">
                {btcPrice?.btc != null ? (
                  <>
                    {(btcPrice.btc * 1000).toFixed(3)}{" "}
                    <span className="text-base font-medium">mBTC</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="flex-1 border-0">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Masternodes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold">
                {mnData?.pagination.total != null &&
                mnData.pagination.total > 0 ? (
                  <>
                    {mnData.pagination.total.toLocaleString()}{" "}
                    <span className="text-base font-medium">Nodes</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="relative flex flex-col border-0">
          <CardHeader>
            <div>
              <CardTitle>
                {chartMetric === "price"
                  ? `${priceCurrency === "usd" ? "USD" : "BTC"} price`
                  : chartMetric === "volume"
                    ? "Volume (24h)"
                    : "Market Cap"}
              </CardTitle>
              <div className="mt-2 flex items-baseline gap-2">
                {chartMetric === "price" && currentPrice != null ? (
                  <>
                    <span className="text-4xl font-extrabold">
                      {priceCurrency === "usd"
                        ? `$${Math.floor(currentPrice)}`
                        : currentPrice.toFixed(5)}
                    </span>
                    {priceCurrency === "usd" && (
                      <span className="text-xl font-extrabold">
                        .{(currentPrice % 1).toFixed(3).slice(2)}
                      </span>
                    )}
                    {priceCurrency === "btc" && (
                      <span className="text-base font-medium">BTC</span>
                    )}
                  </>
                ) : chartMetric !== "price" &&
                  chartHistory &&
                  chartHistory.length > 0 ? (
                  <span className="text-4xl font-extrabold">
                    {priceCurrency === "usd"
                      ? formatCompactUsd(
                          chartHistory[chartHistory.length - 1].value,
                        )
                      : `${chartHistory[chartHistory.length - 1].value.toFixed(2)} BTC`}
                  </span>
                ) : (
                  <span className="text-4xl font-extrabold">—</span>
                )}
                {chartChange != null && (
                  <Badge className="bg-accent/12 font-bold text-accent animate-subtle-pulse">
                    {chartChange >= 0 ? (
                      <MoveUp className="size-3" />
                    ) : (
                      <MoveDown className="size-3" />
                    )}
                    {Math.abs(chartChange).toFixed(1)}%
                  </Badge>
                )}
              </div>
              {chartChange != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Compared to{" "}
                  <span className="font-semibold">24 hours ago</span>
                </p>
              )}
            </div>
            <CardAction className="absolute right-4 top-4 lg:relative lg:right-auto lg:top-auto">
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {(["price", "volume", "mcap"] as const).map((m) => (
                    <Button
                      key={m}
                      variant={m === chartMetric ? "default" : "ghost"}
                      size="xs"
                      className={`rounded-full ${m === chartMetric ? "bg-accent text-accent-foreground" : ""}`}
                      onClick={() => setChartMetric(m)}
                    >
                      {m === "mcap"
                        ? "MCap"
                        : m.charAt(0).toUpperCase() + m.slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {(["usd", "btc"] as const).map((c) => (
                    <Button
                      key={c}
                      variant={c === priceCurrency ? "default" : "ghost"}
                      size="xs"
                      className={`rounded-full ${c === priceCurrency ? "bg-accent text-accent-foreground" : ""}`}
                      onClick={() => setPriceCurrency(c)}
                    >
                      {c.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="mt-auto">
            {chartHistory && chartHistory.length > 0 ? (
              <PriceChart
                data={chartHistory}
                formatValue={(v) =>
                  priceCurrency === "usd"
                    ? chartMetric === "price"
                      ? `$${v.toFixed(2)}`
                      : formatCompactUsd(v)
                    : chartMetric === "price"
                      ? `${v.toFixed(6)} BTC`
                      : `${v.toFixed(2)} BTC`
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </FadeInSection>
    </main>
  );
}
