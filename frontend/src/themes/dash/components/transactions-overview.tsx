import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Pie, PieChart } from "recharts";
import { transactionsBreakdown24hQueryOptions } from "@/lib/api/stats";
import { homeChainQueryOptions } from "@/lib/home";
import type { Network } from "@/lib/store";
import { useHomeChainHistory } from "@/themes/dash/lib/home-history";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { ChainHistoryChart } from "./chain-history-chart";
import { InfoPopover } from "./info-popover";
import { MissingApiData } from "./missing-api-data";
import { SkeletonBar } from "./skeleton";
import { TransactionHistoryCard } from "./transaction-history-card";

export function TransactionsOverview({ network }: { network: Network }) {
  const titleId = useId();
  const chain = useQuery(homeChainQueryOptions(network));
  const fees = useHomeChainHistory(network);
  const breakdown = useQuery({
    ...transactionsBreakdown24hQueryOptions({ network }),
    refetchInterval: 60_000,
  });
  const total = breakdown.data?.total;
  const special = breakdown.data?.special;
  const validComposition =
    total != null &&
    special != null &&
    total >= 0 &&
    special >= 0 &&
    special <= total;
  const slices = validComposition
    ? [
        { name: "Standard", count: total - special, fill: "var(--chart-1)" },
        { name: "Special", count: special, fill: "var(--chart-4)" },
      ]
    : [];
  const surface = "rounded-3xl bg-card px-6 py-4 shadow-card dark:bg-secondary";
  const pending = (description: string) => (
    <MissingApiData inline description={description} />
  );
  return (
    <section
      aria-labelledby={titleId}
      className="space-y-10 rounded-3xl bg-card p-4 sm:rounded-[48px] sm:p-8 xl:space-y-12"
    >
      <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,503fr)_minmax(0,725fr)] xl:gap-12">
        <div>
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            <span
              className="rounded-full bg-positive-brand/12 px-3 py-1 text-success"
              title="Average over the latest 20 blocks"
            >
              TPS: {metricNumber(chain.data?.transactionsPerSecond)}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">
              Mempool: {metricNumber(chain.data?.mempoolSize, 0)}
            </span>
          </div>
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h1
            id={titleId}
            className="dash-heading-page mt-2 sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">Transactions</span>{" "}
            Stats
          </h1>
          <p className="dash-body mt-3 text-foreground/50">
            Explore Dash transactions, their inputs, outputs, fees, and
            confirmation status.
          </p>
        </div>
        <div className="relative grid min-w-0 gap-4 sm:grid-cols-2 xl:block xl:h-[243px]">
          <div
            className={`${surface} relative z-10 xl:absolute xl:left-0 xl:top-0`}
          >
            <h2 className="text-xs text-foreground/50">Transactions · 24H</h2>
            <p className="mt-2 text-xl font-extrabold text-brand">
              {breakdown.isPending ? (
                <SkeletonBar className="w-24" />
              ) : (
                metricNumber(total, 0)
              )}
            </p>
          </div>
          <div
            className={`${surface} relative z-10 xl:absolute xl:right-0 xl:top-0`}
          >
            <h2 className="text-xs text-foreground/50">Current TPS</h2>
            <p
              className="mt-2 text-xl font-extrabold text-brand"
              title="Average over the latest 20 blocks"
            >
              {metricNumber(chain.data?.transactionsPerSecond)}{" "}
              <span className="font-medium">Tx/s</span>
            </p>
          </div>
          <div
            className={`${surface} flex min-w-0 flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center xl:absolute xl:left-[9.5%] xl:top-[55px] xl:h-[133px] xl:w-[82.75%]`}
          >
            <div className="shrink-0">
              <h2 className="text-sm text-foreground/48">
                Latest Core block fees
              </h2>
              <p className="mt-2 text-2xl font-extrabold text-brand">
                {chain.data?.blockFees != null ? (
                  <>
                    {metricDuffs(chain.data.blockFees)}{" "}
                    <span className="font-medium">DASH</span>
                  </>
                ) : (
                  pending(
                    "Return the transaction fees for the latest Core block in duffs.",
                  )
                )}
              </p>
              <p
                className="mt-2 text-xs text-muted-foreground"
                title="The API does not return the height associated with these fees."
              >
                Core tip
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <ChainHistoryChart
                data={fees.data}
                metric="feesPerBlock"
                label="Daily average fees per block · 30 days"
                formatValue={(value) => `${metricDuffs(value)} DASH`}
                loading={fees.isPending}
                error={fees.isError}
                onRetry={() => void fees.refetch()}
                height={64}
              />
            </div>
          </div>
          <div
            className={`${surface} relative z-10 sm:col-span-2 sm:mx-auto sm:w-fit xl:absolute xl:bottom-0 xl:right-[25%]`}
          >
            <h2 className="text-xs text-foreground/50">Average fee · 24H</h2>
            <p className="mt-2 text-xl font-extrabold text-brand">
              {breakdown.data?.averageFee != null ? (
                <>
                  {metricDuffs(breakdown.data.averageFee)}{" "}
                  <span className="font-medium">DASH</span>
                </>
              ) : (
                pending(
                  "Return the average known fee per transaction, excluding coinbase, in duffs.",
                )
              )}
            </p>
          </div>
        </div>
      </div>
      {(chain.isError || breakdown.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Could not refresh transaction statistics.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void chain.refetch();
              void breakdown.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <TransactionHistoryCard network={network} surface="subtle" />
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-1 flex-col items-center gap-6 rounded-3xl bg-secondary p-6 sm:flex-row lg:flex-col xl:flex-row">
            <div className="relative size-[174px] shrink-0" aria-hidden="true">
              {validComposition && total > 0 ? (
                <PieChart width={174} height={174} accessibilityLayer={false}>
                  <Pie
                    data={slices}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={59}
                    outerRadius={86}
                    startAngle={90}
                    endAngle={-270}
                    cornerRadius={4}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                    rootTabIndex={-1}
                  />
                </PieChart>
              ) : (
                <div className="size-full rounded-full border-[26px] border-secondary" />
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <strong className="text-xl tabular-nums">
                  {metricNumber(total, 0)}
                </strong>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold">24h Tx Composition</h2>
                <InfoPopover label="About transaction composition">
                  Standard and special transactions form the chart. CoinJoin and
                  multisig are separate attributes and can overlap; they are not
                  additional slices.
                </InfoPopover>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Confirmed transactions by type
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                {slices.map((slice) => (
                  <div key={slice.name}>
                    <dt className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: slice.fill }}
                      />
                      {slice.name}
                    </dt>
                    <dd className="mt-1 font-extrabold tabular-nums">
                      {metricNumber(slice.count, 0)}{" "}
                      <span className="font-medium text-muted-foreground">
                        {total
                          ? `${metricNumber((slice.count / total) * 100, 1)}%`
                          : ""}
                      </span>
                    </dd>
                  </div>
                ))}
                {(["coinjoin", "multisig"] as const).map((key) => (
                  <div key={key}>
                    <dt className="text-muted-foreground">
                      {key === "coinjoin" ? "CoinJoin" : "Multisig"}
                    </dt>
                    <dd className="mt-1 font-extrabold tabular-nums">
                      {metricNumber(breakdown.data?.[key], 0)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1.2fr_1.2fr_1fr]">
            <div className="min-w-0 rounded-3xl bg-secondary p-5">
              <h2 className="text-sm text-foreground/50">Transaction Fees</h2>
              <p className="mt-2 text-xl font-extrabold text-brand">
                {breakdown.data?.fees != null ? (
                  <>
                    {metricDuffs(breakdown.data.fees)}{" "}
                    <span className="font-medium">DASH</span>
                  </>
                ) : (
                  pending(
                    "Return total transaction fees for the last 24 hours in duffs.",
                  )
                )}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">24H</p>
            </div>
            <div className="min-w-0 rounded-3xl bg-secondary p-5">
              <h2 className="text-sm text-foreground/50">Total Indexed Txs</h2>
              <div className="mt-3">
                {pending(
                  "Return an exact indexed transaction count. The list pagination total is an estimate.",
                )}
              </div>
            </div>
            <div className="min-w-0 rounded-3xl bg-secondary p-5">
              <h2 className="text-sm text-foreground/50">
                InstantSend latency
              </h2>
              <div className="mt-3">
                {pending(
                  "Return measured time from transaction observation to InstantSend lock, with the measurement period. A lock flag does not provide latency.",
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
