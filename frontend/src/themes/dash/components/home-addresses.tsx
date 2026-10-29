import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useId } from "react";
import {
  addressesActivityQueryOptions,
  addressesInfoQueryOptions,
  addressesQueryOptions,
  richListQueryOptions,
} from "@/lib/api/addresses";
import { marketCapQueryOptions } from "@/lib/api/marketcap";
import { priceQueryOptions } from "@/lib/api/price";
import { formatCompact } from "@/lib/format";
import { appStore } from "@/lib/store";
import { addressDistribution } from "@/themes/dash/lib/address-metrics";
import { estimatedSupply, metricNumber } from "@/themes/dash/lib/home-metrics";
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
}: {
  label: string;
  value: ReactNode;
  detail: string;
  missing: string;
}) {
  return (
    <div className="flex min-h-[120px] min-w-0 flex-col justify-center gap-2 rounded-3xl bg-foreground/3 px-6 py-4">
      <h3 className="dash-body-compact text-foreground/50">{label}</h3>
      <p className="dash-metric break-words text-brand">{value}</p>
      <div className="flex flex-wrap items-center gap-2">
        <p className="dash-label-small text-muted-foreground">{detail}</p>
        <MissingApiData inline description={missing} />
      </div>
    </div>
  );
}

function AddressTable({
  rows,
  ranked = false,
}: {
  rows: { address: string; balance: string | null }[];
  ranked?: boolean;
}) {
  return (
    <div className="min-h-0 overflow-auto">
      <HomeTable className="min-w-[480px]">
        <caption className="sr-only">
          {ranked
            ? "Addresses ranked by balance"
            : "Most active addresses in the last 24 hours"}
        </caption>
        <thead className="text-foreground/48">
          <tr>
            <th
              scope="col"
              className="border-b border-foreground/8 px-3 py-3 font-medium"
            >
              Address
            </th>
            <th
              scope="col"
              className="border-b border-foreground/8 px-3 py-3 text-right font-medium"
            >
              Balance
            </th>
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
                        className={`flex size-5 shrink-0 items-center justify-center rounded-lg text-[10px] ${index === 0 ? "bg-brand text-primary-foreground" : "bg-action-subtle text-brand"}`}
                      >
                        {index + 1}
                      </span>
                    )
                  }
                />
              </td>
              <td className="whitespace-nowrap px-3 py-[18px] text-right text-brand">
                {transactionAmount(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </HomeTable>
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
  const price = useQuery(priceQueryOptions({ network, currency: "usd" }));
  const marketCap = useQuery(
    marketCapQueryOptions({ network, currency: "usd" }),
  );
  const activeAddresses = (active.data?.resultSet ?? []).flatMap((entry) =>
    entry.address ? [entry.address] : [],
  );
  const balances = useQuery({
    ...addressesInfoQueryOptions({ network, addresses: activeAddresses }),
    refetchInterval: 60_000,
  });
  const activeRows = activeAddresses.map((address) => ({
    address,
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
  const supply = estimatedSupply(marketCap.data?.usd, price.data?.usd);
  const shares = distribution?.shares;
  const colors = [
    "var(--brand)",
    "var(--chart-5)",
    "var(--chart-3)",
    "var(--action-subtle)",
  ];
  const labels = ["Top 1", "Top 2–5", "Top 6–10", "Other"];
  let position = 0;
  const gradient = shares
    ?.map((share, index) => {
      const start = position;
      position += share;
      return `${colors[index]} ${start}% ${position}%`;
    })
    .join(", ");
  const count = unique.data?.pagination.total;

  return (
    <section
      aria-labelledby={titleId}
      className="grid gap-8 rounded-3xl bg-card p-4 sm:p-8 lg:grid-cols-2 lg:gap-4 lg:rounded-[48px]"
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
          <p className="dash-body mt-3 text-foreground/50">
            Look up balances, incoming and outgoing transactions, and the
            complete history of any Dash address.
          </p>
          <Link
            to="/addresses"
            className="mt-6 flex min-h-12 items-center justify-between gap-4 rounded-full bg-action-subtle py-2 pl-6 pr-2 text-brand hover:bg-brand/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
                  : rich.isError
                    ? "Unavailable"
                    : distribution
                      ? `≈ ${formatCompact(Number(BigInt(distribution.total) / 100_000_000n))} Dash`
                      : "—"
              }
              detail="Current UTXO supply"
              missing="The current total is derived from all rich-list balances, including Others. Historical balances and 24-hour change are not exposed."
            />
            <AddressMetric
              label="Unspent TX Amount"
              value="—"
              detail="Count unavailable"
              missing="The API does not expose a network-wide unspent transaction/output count or its history."
            />
          </div>
          <div className="flex min-h-[392px] min-w-0 flex-1 flex-col gap-6 rounded-3xl bg-foreground/3 p-6">
            <div>
              <h3 className="dash-heading-section">Active Addresses List</h3>
              <p className="dash-body-compact mt-2 text-foreground/48">
                {active.data
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
              <MissingApiData description="The active addresses endpoint is not available on this backend." />
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
            label="Circulating Supply"
            value={supply === null ? "—" : `≈ ${formatCompact(supply)} Dash`}
            detail="Market estimate"
            missing="Monthly supply history and change are not exposed. This is a market-data estimate, not the UTXO total."
          />
          <AddressMetric
            label="Unique Addresses"
            value={
              unique.isPending
                ? "…"
                : unique.isError
                  ? "Unavailable"
                  : count != null && count >= 0
                    ? `≈ ${metricNumber(count, 0)}`
                    : "—"
            }
            detail="All indexed addresses"
            missing="Monthly unique-address history and change are not exposed. The list total may be an index estimate."
          />
        </div>
        <div className="flex min-h-[677px] min-w-0 flex-1 flex-col gap-12 rounded-3xl bg-foreground/3 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
            <div
              role="img"
              aria-label={
                shares
                  ? `Balance distribution: ${labels.map((label, index) => `${label} ${metricNumber(shares[index])}%`).join(", ")}`
                  : "Balance distribution unavailable"
              }
              className="relative size-40 shrink-0 rounded-full bg-secondary"
              style={
                gradient
                  ? { background: `conic-gradient(${gradient})` }
                  : undefined
              }
            >
              <div className="absolute inset-7 rounded-full bg-card">
                <div className="size-full rounded-full bg-foreground/3" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <h3 className="dash-body-compact text-foreground/50">
                Top 10 Concentration
              </h3>
              <p className="text-2xl leading-8">
                Controlling{" "}
                <strong className="text-brand">
                  {metricNumber(distribution?.topTen)}%
                </strong>{" "}
                of supply
              </p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {labels.map((label, index) => (
                  <div key={label} className="rounded-lg bg-secondary p-2">
                    <dt className="flex items-center gap-1 whitespace-nowrap text-xs text-foreground/50">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: colors[index] }}
                      />
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-extrabold">
                      {metricNumber(shares?.[index])}%
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <div>
              <h3 className="dash-heading-section">Addresses Rich List</h3>
              <p className="dash-body-compact mt-2 text-foreground/48">
                Largest indexed balances · updates every minute
              </p>
            </div>
            {rich.isError ? (
              <LoadError retry={() => void rich.refetch()}>
                Could not load rich list.
              </LoadError>
            ) : rich.isPending ? (
              <p className="text-muted-foreground">Loading rich list…</p>
            ) : !richRows.length ? (
              <p className="text-muted-foreground">
                No address balances found.
              </p>
            ) : (
              <div className="max-h-[328px] overflow-auto">
                <AddressTable rows={richRows} ranked />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
