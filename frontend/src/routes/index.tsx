import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Avatar } from "dash-ui-kit/react";
import { ArrowLeftRight, Box, MoveUp } from "lucide-react";
import { AnimatedNumber } from "@/components/animated-number";
import { CandlestickChart } from "@/components/candlestick-chart";
import { FadeInSection } from "@/components/fade-in-section";
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
import { formatRelativeTime } from "@/lib/format";
import { appStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "Dashboard | DashScan" }],
  }),
  loader: ({ context }) => {
    if (typeof window !== "undefined") return;
    return context.queryClient.prefetchQuery(
      blocksQueryOptions({
        network: "mainnet",
        page: 1,
        limit: 5,
        order: "desc",
      }),
    );
  },
});

const TRANSACTIONS = [
  {
    hash: "9692b2f...aedf656",
    from: "XquGg...U4kYd",
    amount: "1.25 DASH",
    time: "12 secs ago",
  },
  {
    hash: "40cb50d...fd3a6fc",
    from: "Xpydx...BsCFW",
    amount: "0.187 DASH",
    time: "6 mins ago",
  },
  {
    hash: "9692b2f...aedf656",
    from: "Xd9c7...oMa2A",
    amount: "23 DASH",
    time: "5 hours ago",
  },
  {
    hash: "9692b2f...aedf656",
    from: "B917BB...08F234",
    amount: "2.08 DASH",
    time: "12 days ago",
  },
  {
    hash: "9692b2f...aedf656",
    from: "B917BB...08F234-2",
    amount: "0.25 DASH",
    time: "3 weeks ago",
  },
];

const MASTERNODES = [
  { hash: "0003ac...f0b1c", ip: "72.62.58.108", status: "Enabled", size: "4k" },
  { hash: "XygRg...TcCRJ", ip: "45.76.234.147", status: "Enabled", size: "1k" },
  {
    hash: "XygRg...TcCRJ-2",
    ip: "47.110.146.65",
    status: "Enabled",
    size: "1k",
  },
  { hash: "XygRg...TcCRJ-3", ip: "0", status: "Paused", size: "1k" },
];

const BAR_HEIGHTS = [
  40, 30, 50, 65, 80, 90, 70, 55, 45, 60, 75, 35, 58, 42, 72, 85, 38, 62,
];
const BAR_LABELS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
];

const CANDLES = [
  { label: "01", low: 30, high: 70, open: 40, close: 60 },
  { label: "02", low: 20, high: 80, open: 60, close: 35 },
  { label: "03", low: 35, high: 75, open: 45, close: 65 },
  { label: "04", low: 25, high: 85, open: 70, close: 40 },
  { label: "05", low: 30, high: 90, open: 50, close: 80 },
  { label: "06", low: 40, high: 80, open: 55, close: 70 },
  { label: "07", low: 20, high: 70, open: 60, close: 30 },
  { label: "08", low: 15, high: 65, open: 25, close: 55 },
  { label: "09", low: 35, high: 85, open: 75, close: 45 },
  { label: "10", low: 28, high: 72, open: 38, close: 62 },
  { label: "11", low: 18, high: 78, open: 65, close: 28 },
  { label: "12", low: 32, high: 88, open: 42, close: 78 },
  { label: "13", low: 22, high: 68, open: 58, close: 32 },
  { label: "14", low: 38, high: 82, open: 48, close: 72 },
  { label: "15", low: 25, high: 75, open: 65, close: 35 },
  { label: "16", low: 30, high: 85, open: 40, close: 75 },
  { label: "17", low: 20, high: 70, open: 55, close: 30 },
  { label: "18", low: 35, high: 90, open: 45, close: 80 },
];

function Dashboard() {
  const network = useStore(appStore, (state) => state.network);
  const { data: blocksData } = useQuery(
    blocksQueryOptions({ network, page: 1, limit: 5, order: "desc" }),
  );

  return (
    <main className="mx-auto max-w-[1440px] px-6 py-10">
      {/* Hero */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Welcome to #1</p>
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-accent">Dash</span> Blockchain Explorer
        </h1>
      </div>

      {/* Row 1 — Transactions History | Transactions | Blocks */}
      <div
        className="mb-6 grid gap-6 lg:grid-cols-3 animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        {/* Transactions History */}
        <Card
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
              <AnimatedNumber value={128} className="text-4xl font-extrabold" />
              <span className="text-sm font-medium text-muted-foreground">
                TXS
              </span>
              <Badge className="bg-accent/12 font-bold text-accent animate-subtle-pulse">
                <MoveUp className="size-3" />
                2.5%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Compared to <span className="font-semibold">78</span> last month
            </p>
            {/* Placeholder bar chart */}
            <div className="mt-auto flex items-end justify-center gap-2">
              {BAR_HEIGHTS.map((h, i) => (
                <div
                  key={BAR_LABELS[i]}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative flex justify-center">
                    <div
                      className="group h-[60px] w-[10px] cursor-pointer rounded-full bg-accent/32 transition-all hover:bg-accent hover:shadow-[0_0_12px_4px_oklch(from_var(--accent)_l_c_h/0.25)]"
                      style={{ marginBottom: `${h * 1.5}px` }}
                    >
                      <div className="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                        {h} txs
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {BAR_LABELS[i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
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
            {TRANSACTIONS.map((tx) => (
              <div
                key={tx.from}
                className="-mx-3 flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors duration-100 hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full border border-accent/12 text-accent">
                    <ArrowLeftRight className="size-4" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium">{tx.hash}</p>
                    <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      from: <Avatar username={tx.from} className="size-3.5" />{" "}
                      {tx.from}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{tx.amount}</p>
                  <p className="text-xs text-muted-foreground">{tx.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Blocks */}
        <Card>
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

      {/* Row 2 — Masternodes | Stats | USD Price */}
      <FadeInSection
        className="grid gap-6 lg:grid-cols-[1fr_auto_2fr]"
        delay={200}
      >
        {/* Masternodes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Masternodes
            </CardTitle>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                className="h-auto rounded-full px-[18px] py-3"
                asChild
              >
                <Link to="/masternodes">See All</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {MASTERNODES.map((mn) => (
              <div
                key={mn.ip}
                className="-mx-3 flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors duration-100 hover:bg-accent/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full border border-accent/12">
                    <Avatar
                      username={mn.hash.replace(/-\d+$/, "")}
                      className="size-5"
                    />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium">
                      {mn.hash.replace(/-\d+$/, "")}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      IP: {mn.ip}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${mn.status === "Paused" ? "text-muted-foreground" : ""}`}
                  >
                    {mn.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Size: {mn.size}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Stats Column */}
        <div className="flex flex-col gap-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Market Cap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold">
                $482.52 <span className="text-base font-medium">M</span>
              </p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                BTC price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold">
                0.43768 <span className="text-base font-medium">mBTC</span>
              </p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Master Nodes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold">
                2,864 <span className="text-base font-medium">Nodes</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* USD Price */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>USD price</CardTitle>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold">$38</span>
                <span className="text-xl font-extrabold">.550</span>
                <Badge className="bg-accent/12 font-bold text-accent animate-subtle-pulse">
                  <MoveUp className="size-3" />
                  3.6%
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Compared to <span className="font-semibold">yesterday</span>
              </p>
            </div>
            <CardAction>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Timeframe
                </span>
                {["1H", "24H", "3D", "1W"].map((tf) => (
                  <Button
                    key={tf}
                    variant={tf === "1W" ? "default" : "ghost"}
                    size="xs"
                    className={`rounded-full ${tf === "1W" ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <CandlestickChart candles={CANDLES} />
          </CardContent>
        </Card>
      </FadeInSection>
    </main>
  );
}
