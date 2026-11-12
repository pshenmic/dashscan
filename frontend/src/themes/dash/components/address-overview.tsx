import type { ReactNode } from "react";
import { RelativeTime } from "@/components/relative-time";
import type { ApiAddressDetail } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { metricDuffs, metricNumber } from "@/themes/dash/lib/home-metrics";
import { IdentifierLink } from "./identifier-link";

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
        <DetailRow label="First transaction">
          <AddressTransaction
            timestamp={detail.firstSeenBlockTimestamp}
            hash={detail.firstSeenTx}
          />
        </DetailRow>
        <DetailRow label="Latest transaction">
          <AddressTransaction
            timestamp={detail.lastSeenBlockTimestamp}
            hash={detail.lastSeenTx}
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
    <div className="group min-w-0 space-y-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function AddressTransaction({
  timestamp,
  hash,
}: {
  timestamp: string | null;
  hash: string | null;
}) {
  const hasTimestamp = timestamp && Number.isFinite(Date.parse(timestamp));
  return (
    <div className="min-w-0 space-y-2">
      {hash ? (
        <IdentifierLink kind="transaction" value={hash} />
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      {hasTimestamp && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <time dateTime={timestamp}>
            {formatDateTime(new Date(timestamp))}
          </time>
          <span className="rounded-lg border border-border px-2 py-1">
            <RelativeTime timestamp={timestamp} />
          </span>
        </div>
      )}
    </div>
  );
}
