import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RelativeTime } from "@/components/relative-time";
import type { ApiAddressDetail } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { MissingApiData } from "./missing-api-data";

export function AddressOverview({ detail }: { detail: ApiAddressDetail }) {
  return (
    <section
      aria-label="Address summary"
      className="flex min-w-0 flex-col gap-6 rounded-3xl bg-card p-4 sm:px-6 sm:py-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AddressMetric label="Balance" name="balance" value={detail.balance} />
        <AddressMetric
          label="Received"
          name="received"
          value={detail.received}
        />
        <AddressMetric
          label="Transactions"
          name="transactions"
          value={detail.txCount}
          count
        />
        <AddressMetric label="Sent" name="sent" value={detail.sent} />
      </div>
      <dl className="flex flex-1 flex-col justify-center gap-4 text-sm">
        <DetailRow label="First seen">
          <AddressTime
            timestamp={detail.firstSeenBlockTimestamp}
            hash={detail.firstSeenTx}
          />
        </DetailRow>
        <DetailRow label="Last seen">
          <AddressTime
            timestamp={detail.lastSeenBlockTimestamp}
            hash={detail.lastSeenTx}
          />
        </DetailRow>
        <DetailRow label="Total fees">
          <MissingApiData
            inline
            description="Return total fees attributed to this address in duffs. Define how fees are allocated when a transaction spends inputs from multiple addresses."
          />
        </DetailRow>
        <DetailRow label="Average fee">
          <MissingApiData
            inline
            description="Return the average fee attributed to this address in duffs. Define the included transactions and use the same allocation rule as total fees."
          />
        </DetailRow>
      </dl>
    </section>
  );
}

function AddressMetric({
  label,
  name,
  value,
  count = false,
}: {
  label: string;
  name: string;
  value: string | number | null;
  count?: boolean;
}) {
  const icon = count
    ? "/icons/block-detail/transactions.svg"
    : `/icons/address/${name}.svg`;
  return (
    <div className="relative flex min-h-24 min-w-0 items-center gap-3 overflow-hidden rounded-3xl bg-brand/4 p-3">
      {!count && (
        <img
          src={`/icons/address/${name}-decoration.svg`}
          alt=""
          aria-hidden="true"
          width={100}
          height={100}
          className="pointer-events-none absolute -right-3 -top-2 size-28"
        />
      )}
      <img
        src={icon}
        alt=""
        width={48}
        height={48}
        className="relative size-12 shrink-0"
      />
      <div className="relative min-w-0">
        <p className="mb-2 text-sm text-muted-foreground">{label}</p>
        <p
          className="break-words text-base font-extrabold tabular-nums"
          title={count ? undefined : `${metricDuffs(value)} DASH`}
        >
          {count
            ? metricNumber(value == null ? null : Number(value), 0)
            : metricDuffs(value, 4)}
          {!count && (
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              DASH
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function AddressTime({
  timestamp,
  hash,
}: {
  timestamp: string | null;
  hash: string | null;
}) {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp)))
    return <span className="text-muted-foreground">—</span>;
  const time = (
    <time dateTime={timestamp}>{formatDateTime(new Date(timestamp))}</time>
  );
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      {hash ? (
        <Link
          to="/transactions/$hash"
          params={{ hash }}
          className="hover:text-accent hover:underline"
        >
          {time}
        </Link>
      ) : (
        time
      )}
      <span className="rounded-lg border border-border px-2 py-1 text-muted-foreground">
        <RelativeTime timestamp={timestamp} />
      </span>
    </span>
  );
}
