import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useId, useState } from "react";
import { Tooltip as ChartTooltip, Pie, PieChart } from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  addressesActivityQueryOptions,
  addressesInfoQueryOptions,
  addressesQueryOptions,
  richListQueryOptions,
} from "@/lib/api/addresses";
import { supplyQueryOptions } from "@/lib/api/chain";
import { addressHistoryQueryOptions } from "@/lib/api/stats";
import { formatCompact } from "@/lib/format";
import { appStore } from "@/lib/store";
import { addressDistribution } from "@/themes/dash/lib/address-metrics";
import {
  percentageChange,
  snapshotChange,
  useHistoryRange,
  useHomeChainHistory,
} from "@/themes/dash/lib/home-history";
import { metricNumber, supplyInDash } from "@/themes/dash/lib/home-metrics";
import { transactionAmount } from "@/themes/dash/lib/transaction-metrics";
import { HomeIcon } from "./home-icon";
import { HomeTable } from "./home-table";
import { IdentifierLink } from "./identifier-link";
import { MissingApiData } from "./missing-api-data";

function AddressMetric({
  label,
  value,
  detail,
  missing,
  period,
  change,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  missing?: string;
  period?: string;
  change?: number | null;
}) {
  return (
    <div className="flex min-h-[120px] min-w-0 flex-col justify-center gap-2 rounded-3xl dash-home-panel px-6 py-4">
      <h3 className="dash-body-compact text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {label}
            </button>
          </TooltipTrigger>
          <TooltipContent>{detail}</TooltipContent>
        </Tooltip>
      </h3>
      <p className="dash-metric break-words text-accent">{value}</p>
      {!missing && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="dash-label-small text-muted-foreground">
            {period ?? detail}
          </span>
          {change != null && (
            <span className="text-xs font-medium text-accent">
              {change > 0 ? "+" : ""}
              {metricNumber(change)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AddressTable({
  rows,
  ranked = false,
}: {
  rows: { address: string; balance: string | null; txCount?: number | null }[];
  ranked?: boolean;
}) {
  return (
    <div className={`min-h-0 overflow-auto ${ranked ? "max-h-[328px]" : ""}`}>
      <HomeTable className="min-w-[480px]">
        <caption className="sr-only">
          {ranked
            ? "Addresses ranked by balance"
            : "Most active addresses in the last 24 hours"}
        </caption>
        <thead className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--foreground)_3%,var(--card))] text-muted-foreground">
          <tr>
            <th
              scope="col"
              className={`border-b border-foreground/8 pb-3 pt-2 pr-3 font-medium ${ranked ? "pl-10" : "pl-3"}`}
            >
              Address
            </th>
            <th
              scope="col"
              className="border-b border-foreground/8 px-3 pb-3 pt-2 text-right font-medium"
            >
              Balance
            </th>
            {!ranked && (
              <th
                scope="col"
                className="whitespace-nowrap border-b border-foreground/8 px-3 pb-3 pt-2 text-right font-medium"
              >
                Txs · 24H
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.address}
              className="border-b border-foreground/8 last:border-0 hover:bg-brand/4"
            >
              <td data-grow className="px-3 py-[18px]">
                <IdentifierLink
                  kind="address"
                  value={row.address}
                  prefix={
                    ranked && (
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-lg text-[10px] ${index === 0 ? "bg-action-solid text-primary-foreground" : index === 1 ? "bg-action-subtle text-accent" : index === 2 ? "bg-action-subtle text-accent" : "bg-foreground/4 text-foreground"}`}
                      >
                        {index + 1}
                      </span>
                    )
                  }
                />
              </td>
              <td className="whitespace-nowrap px-3 py-[18px] text-right text-accent">
                {transactionAmount(row.balance)}
              </td>
              {!ranked && (
                <td className="px-3 py-[18px] text-right tabular-nums">
                  {metricNumber(row.txCount, 0)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </HomeTable>
    </div>
  );
}

function BalanceDistribution({
  distribution,
}: {
  distribution: NonNullable<ReturnType<typeof addressDistribution>>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const labels = ["Top 1", "Top 2–5", "Top 6–10", "Other"];
  const colors = [
    "var(--brand)",
    "var(--chart-5)",
    "var(--chart-3)",
    "var(--action-subtle)",
  ];
  if (!distribution.shares || !distribution.amounts) {
    return (
      <p className="dash-body-compact text-muted-foreground">
        No unspent balance to display.
      </p>
    );
  }
  const segments = distribution.shares.map((value, index) => ({
    name: labels[index],
    value,
    fill: colors[index],
    fillOpacity:
      (hovered ?? selected) != null && (hovered ?? selected) !== index
        ? 0.75
        : 1,
    amount: distribution.amounts?.[index],
  }));
  const multipleSegments =
    segments.filter((segment) => segment.value > 0).length > 1;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
      <div
        className="size-40 shrink-0"
        aria-hidden="true"
        onMouseLeave={() => setHovered(null)}
      >
        <PieChart width={160} height={160} accessibilityLayer={false}>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={54}
            outerRadius={79}
            startAngle={90}
            endAngle={-270}
            cornerRadius={multipleSegments ? 4 : 0}
            paddingAngle={multipleSegments ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
            rootTabIndex={-1}
            onMouseEnter={(_, index) => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          />
          <ChartTooltip
            allowEscapeViewBox={{ x: true, y: true }}
            content={({ active, payload }) => {
              const segment = payload?.[0]?.payload as
                | (typeof segments)[number]
                | undefined;
              return active && segment ? (
                <div className="max-w-64 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <p>
                    {segment.name} · {metricNumber(segment.value)}%
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {transactionAmount(segment.amount)}
                  </p>
                </div>
              ) : null;
            }}
          />
        </PieChart>
      </div>
      <div className="min-w-0 w-full flex-1 space-y-3">
        <h3 className="dash-body-compact text-muted-foreground">
          Top 10 addresses
        </h3>
        <p className="text-2xl leading-8">
          <strong className="text-accent">
            {metricNumber(distribution.topTen)}%
          </strong>{" "}
          of unspent balance
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {segments.map((segment, index) => (
            <Tooltip
              key={segment.name}
              open={selected === index}
              onOpenChange={(open) => setSelected(open ? index : null)}
            >
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${segment.name}: ${metricNumber(segment.value)}%`}
                  onFocus={() => setSelected(index)}
                  onBlur={() => setSelected(null)}
                  onClick={(event) => {
                    event.preventDefault();
                    setSelected(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSelected(null);
                  }}
                  className={`min-w-0 rounded-lg bg-secondary p-2 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${selected === index ? "ring-1 ring-brand" : ""}`}
                >
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: colors[index] }}
                    />
                    {segment.name}
                  </span>
                  <span className="mt-1 block text-sm font-extrabold tabular-nums">
                    {metricNumber(segment.value)}%
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {segment.name} · {metricNumber(segment.value)}%
                </p>
                <p>{transactionAmount(distribution.amounts?.[index])}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadError({
  children,
  retry,
}: {
  children: ReactNode;
  retry: () => void;
}) {
  return (
    <p role="alert" className="dash-body-compact text-destructive">
      {children}{" "}
      <button type="button" className="underline" onClick={retry}>
        Try again
      </button>
    </p>
  );
}

export function HomeAddresses() {
  const titleId = useId();
  const network = useStore(appStore, (state) => state.network);
  const active = useQuery({
    ...addressesActivityQueryOptions({
      network,
      page: 1,
      limit: 4,
      order: "desc",
    }),
    refetchInterval: 60_000,
  });
  const rich = useQuery({
    ...richListQueryOptions({ network, page: 1, limit: 11, order: "desc" }),
    refetchInterval: 60_000,
  });
  const unique = useQuery({
    ...addressesQueryOptions({ network, page: 1, limit: 1 }),
    refetchInterval: 60_000,
  });
  const networkSupply = useQuery(supplyQueryOptions({ network }));
  const activeAddresses = (active.data?.resultSet ?? []).flatMap((entry) =>
    entry.address ? [entry.address] : [],
  );
  const balances = useQuery({
    ...addressesInfoQueryOptions({ network, addresses: activeAddresses }),
    refetchInterval: 60_000,
  });
  const activeRows = activeAddresses.map((address) => ({
    address,
    txCount: active.data?.resultSet.find((entry) => entry.address === address)
      ?.txCount,
    balance:
      balances.data?.find((entry) => entry.address === address)?.balance ??
      null,
  }));
  const richRows = (rich.data?.resultSet ?? []).flatMap((entry) =>
    entry.address && entry.address !== "others"
      ? [{ address: entry.address, balance: entry.balance }]
      : [],
  );
  const distribution = addressDistribution(rich.data?.resultSet);
  const utxo = rich.data?.utxoSummary;
  const unspentAmount =
    utxo?.totalAmountDuffs != null && /^\d+$/.test(utxo.totalAmountDuffs)
      ? utxo.totalAmountDuffs
      : distribution?.total;
  const outputCount =
    utxo?.outputCount != null &&
    Number.isSafeInteger(utxo.outputCount) &&
    utxo.outputCount >= 0
      ? utxo.outputCount
      : null;
  const utxoDetail =
    utxo?.height != null &&
    Number.isSafeInteger(utxo.height) &&
    utxo.height >= 0
      ? `Core UTXO snapshot at block #${metricNumber(utxo.height, 0)}`
      : "Core UTXO snapshot";
  const supply = supplyInDash(networkSupply.data?.totalSupply);
  const count = unique.data?.pagination.total;
  const addressRange = useHistoryRange(31);
  const addressHistory = useQuery(
    addressHistoryQueryOptions({ network, ...addressRange }),
  );
  const snapshots = useHomeChainHistory(network, 2, 48);
  const unspentChange = snapshotChange(snapshots.data, "utxoAmount", 1);
  const indexedCount = addressHistory.data?.at(-1)?.data.totalAddresses;
  const addressChange =
    addressHistory.data?.length === 31
      ? percentageChange(
          indexedCount,
          addressHistory.data[0].data.totalAddresses,
        )
      : null;

  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-8 py-4 sm:py-8 lg:grid-cols-2 lg:gap-4"
    >
      <div className="flex min-w-0 flex-col gap-10 lg:gap-16">
        <div className="flex min-h-[221px] flex-col justify-center lg:max-w-[554px]">
          <p className="text-xl font-medium text-muted-foreground">
            Dash Chain
          </p>
          <h2
            id={titleId}
            className="dash-heading-page mt-2 sm:dash-heading-hero"
          >
            <span className="font-extrabold text-brand">Addresses</span> Stats
          </h2>
          <p className="dash-body mt-3 text-muted-foreground">
            Look up balances, incoming and outgoing transactions, and the
            complete history of any Dash address.
          </p>
          <Link
            to="/addresses"
            className="dash-home-action dash-home-action-subtle mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full py-2 pl-6 pr-2 text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            Explore Addresses
            <span className="flex size-8 items-center justify-center rounded-full bg-action-primary text-primary-foreground">
              <HomeIcon name="explore" />
            </span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AddressMetric
              label="Unspent Balance"
              value={
                rich.isPending
                  ? "…"
                  : rich.isError && !rich.data
                    ? "Unavailable"
                    : unspentAmount != null
                      ? `≈ ${formatCompact(Number(BigInt(unspentAmount) / 100_000_000n))} DASH`
                      : "—"
              }
              detail={utxoDetail}
              period="24H snapshot change"
              change={unspentChange}
              missing={
                snapshots.isSuccess && unspentChange == null
                  ? "The API has not yet provided snapshots covering a full 24 hours for the UTXO balance comparison."
                  : undefined
              }
            />
            <AddressMetric
              label="Unspent Outputs"
              value={
                rich.isPending
                  ? "…"
                  : rich.isError && !rich.data
                    ? "Unavailable"
                    : metricNumber(outputCount, 0)
              }
              detail={utxoDetail}
              missing={
                !rich.isPending && !rich.isError && outputCount == null
                  ? "This API version does not expose the Core UTXO output count."
                  : undefined
              }
            />
          </div>
          <div className="flex min-h-[392px] min-w-0 flex-1 flex-col gap-6 rounded-3xl dash-home-panel p-6">
            <div>
              <h3 className="dash-heading-section">Active Addresses List</h3>
              <p className="dash-body-compact mt-2 text-muted-foreground">
                {active.data && active.data.pagination.total >= 0
                  ? `${metricNumber(active.data.pagination.total, 0)} addresses · last 24 hours`
                  : "Last 24 hours"}
              </p>
            </div>
            {active.isError ? (
              <LoadError retry={() => void active.refetch()}>
                Could not load active addresses.
              </LoadError>
            ) : active.isPending ? (
              <p className="text-muted-foreground">Loading active addresses…</p>
            ) : active.data === null ? (
              <MissingApiData
                label="Unavailable"
                description="The active addresses endpoint is not available on this backend."
              />
            ) : !activeRows.length ? (
              <p className="text-muted-foreground">
                No active addresses in this period.
              </p>
            ) : (
              <>
                {balances.isError && (
                  <LoadError retry={() => void balances.refetch()}>
                    Could not refresh balances.
                  </LoadError>
                )}
                {balances.isPending && (
                  <p className="dash-label-small text-muted-foreground">
                    Loading balances…
                  </p>
                )}
                <AddressTable rows={activeRows} />
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AddressMetric
            label="Network Supply"
            value={supply === null ? "—" : `≈ ${formatCompact(supply)} DASH`}
            detail="Sum of unspent outputs reported by Dash Core for the selected network. Cached for 30 minutes; not market-provider circulating supply."
            period="Core UTXO snapshot"
          />
          <AddressMetric
            label="Unique Addresses"
            value={
              indexedCount != null
                ? metricNumber(indexedCount, 0)
                : unique.isPending
                  ? "…"
                  : unique.isError
                    ? "Unavailable"
                    : count != null && count >= 0
                      ? `≈ ${metricNumber(count, 0)}`
                      : "—"
            }
            detail="Indexed addresses reconstructed from hourly new-address counts; available through the end of the last complete UTC hour."
            period="30D change"
            change={addressChange}
            missing={
              addressHistory.isSuccess && addressChange == null
                ? "Complete address history for a 30-day comparison is not available."
                : undefined
            }
          />
        </div>
        <div className="flex min-h-[677px] min-w-0 flex-1 flex-col gap-12 rounded-3xl dash-home-panel p-6">
          {rich.isPending ? (
            <p className="dash-body-compact text-muted-foreground">
              Loading balance distribution…
            </p>
          ) : distribution ? (
            <BalanceDistribution key={network} distribution={distribution} />
          ) : !rich.isError ? (
            <MissingApiData
              label="Unavailable"
              description="The API has not provided a complete balance distribution."
            />
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <div>
              <h3 className="dash-heading-section">Addresses Rich List</h3>
              <p className="dash-body-compact mt-2 text-muted-foreground">
                Largest indexed balances · updates every minute
              </p>
            </div>
            {rich.isError && (
              <LoadError retry={() => void rich.refetch()}>
                {rich.data
                  ? "Could not refresh balances. Showing previous data."
                  : "Could not load balances."}
              </LoadError>
            )}
            {rich.isPending ? (
              <p className="text-muted-foreground">Loading rich list…</p>
            ) : rich.isError && !rich.data ? null : !richRows.length ? (
              <p className="text-muted-foreground">
                No address balances found.
              </p>
            ) : (
              <AddressTable rows={richRows} ranked />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
