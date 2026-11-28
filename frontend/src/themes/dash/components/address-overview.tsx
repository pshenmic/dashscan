import { RelativeTime } from "@/components/relative-time";
import type { ApiAddressDetail } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { metricDuffs } from "@/themes/dash/lib/home-metrics";
import { IdentifierLink } from "./identifier-link";
import { InfoPopover } from "./info-popover";

export function AddressOverview({ detail }: { detail: ApiAddressDetail }) {
  return (
    <div className="isolate grid min-w-0 gap-4 sm:gap-0">
      <section
        aria-label="Address balance"
        className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:row-start-2 sm:mr-6 sm:-mt-4 sm:px-5 sm:py-8"
      >
        <h2 className="text-xl font-extrabold">
          <InfoPopover label="Balance" trigger="Balance">
            Balance of unspent outputs, including mempool changes. Not all
            outputs are immediately spendable.
          </InfoPopover>
        </h2>
        <p className="mt-1 wrap-anywhere text-2xl font-bold tabular-nums text-accent sm:text-3xl">
          {metricDuffs(detail.balance)}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            DASH
          </span>
        </p>
        <dl className="mt-3 grid gap-2 border-t border-border pt-3">
          {[
            { label: "Received", value: detail.received },
            { label: "Sent", value: detail.sent },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
            >
              <dt className="text-xs text-muted-foreground">
                <InfoPopover label={label} trigger={label}>
                  {label === "Received"
                    ? "Total received in confirmed transactions."
                    : "Total spent in confirmed transactions."}
                </InfoPopover>
              </dt>
              <dd className="min-w-0 wrap-anywhere text-right text-sm font-semibold tabular-nums">
                {metricDuffs(value)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  DASH
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <dl className="contents">
        {[
          {
            label: "First transaction",
            hash: detail.firstSeenTx,
            timestamp: detail.firstSeenBlockTimestamp,
            position: "sm:row-start-1 sm:justify-self-end",
          },
          {
            label: "Latest transaction",
            hash: detail.lastSeenTx,
            timestamp: detail.lastSeenBlockTimestamp,
            position: "sm:row-start-3 sm:-mt-4 sm:justify-self-center",
          },
        ].map(({ label, hash, timestamp, position }) => (
          <div
            key={label}
            className={`group relative z-10 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[var(--card-shadow)] sm:w-[85%] ${position}`}
          >
            <dt className="text-xs font-medium text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 min-w-0 space-y-2 text-sm">
              {hash ? (
                <IdentifierLink kind="transaction" value={hash} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {timestamp && Number.isFinite(Date.parse(timestamp)) && (
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <time dateTime={timestamp} className="text-xs">
                    {formatDateTime(new Date(timestamp))}
                  </time>
                  <span className="text-xs text-muted-foreground">
                    <RelativeTime timestamp={timestamp} />
                  </span>
                </div>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
