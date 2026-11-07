import type { ReactNode } from "react";
import { Avatar } from "@/components/identicon";
import type { ApiMasternode } from "@/lib/api/types";
import { formatDateTime, getMnTypeLabel } from "@/lib/format";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { CopyButton } from "./copy-button";
import { IdentifierLink } from "./identifier-link";
import {
  MasternodeStatusBadge,
  MasternodeTypeBadge,
} from "./masternode-badges";
import { MissingApiData } from "./missing-api-data";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2 border-b border-border/50 py-3 last:border-0 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm sm:text-right">{children}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-3xl bg-card px-4 py-3 sm:px-6"
    >
      <h2 className="sr-only">{title}</h2>
      {children}
    </section>
  );
}

function AddressValue({ value }: { value: string }) {
  if (!value) return "—";
  return /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{26,35}$/.test(
    value,
  ) ? (
    <IdentifierLink kind="address" value={value} />
  ) : (
    <span className="break-all font-mono text-xs">{value}</span>
  );
}

function KeyValue({
  value,
  wrap = false,
}: {
  value?: string | null;
  wrap?: boolean;
}) {
  if (!value) return "—";
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        title={value}
        className={`min-w-0 flex-1 font-mono text-xs ${wrap ? "break-all" : "truncate"}`}
      >
        {value}
      </span>
      <CopyButton value={value} />
    </div>
  );
}

function portLabel(port?: number | null) {
  return port != null && Number.isInteger(port) && port > 0 && port <= 65535
    ? port
    : "—";
}

export function MasternodeOverview({ node }: { node: ApiMasternode }) {
  const collateral = /^([a-f\d]{64})[:-](\d+)$/i.exec(node.outpoint ?? "");
  const service = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(node.address ?? "");
  const host = service?.[1] ?? node.address;
  const evo = getMnTypeLabel(node.type) === "Evonode";
  const ownerVotes =
    Boolean(node.ownerAddress) && node.ownerAddress === node.votingAddress;
  const registered =
    node.registrationTimestamp && Date.parse(node.registrationTimestamp) > 0
      ? node.registrationTimestamp
      : null;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card title="Masternode profile">
        <div className="grid min-w-0 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_144px]">
          <dl className="min-w-0">
            <Field label="ProTxHash">
              <IdentifierLink kind="transaction" value={node.proTxHash} />
            </Field>
            <Field label="Registration">
              {registered ? (
                <time dateTime={registered}>{formatDateTime(registered)}</time>
              ) : (
                <MissingApiData
                  inline
                  description="The ProRegTx block timestamp is needed. The indexer's creation date is not the registration date."
                />
              )}
            </Field>
            <Field label="Service">
              <div className="flex flex-wrap gap-x-3 gap-y-2 font-mono text-xs sm:justify-end">
                <span>
                  Core:{portLabel(service ? Number(service[2]) : null)}
                </span>
                {evo && (
                  <>
                    <span>Platform:{portLabel(node.platformP2PPort)}</span>
                    <span>HTTP:{portLabel(node.platformHTTPPort)}</span>
                  </>
                )}
              </div>
            </Field>
          </dl>
          <aside
            aria-label="Masternode avatar and IP"
            className="order-first flex min-w-0 items-center gap-3 py-3 sm:order-last sm:flex-col"
          >
            <Avatar
              username={node.proTxHash}
              className="size-12 shrink-0 sm:size-[88px]"
            />
            <div className="min-w-0 flex-1 sm:w-full sm:flex-none sm:text-center">
              <KeyValue value={host} wrap />
            </div>
          </aside>
        </div>
      </Card>
      <Card title="Core status">
        <dl>
          <Field label="Type">
            <MasternodeTypeBadge type={node.type} />
          </Field>
          <Field label="Core status">
            <MasternodeStatusBadge status={node.status} />
          </Field>
          <Field label="PoSe penalty">
            <span className="tabular-nums">
              {metricNumber(node.posPenaltyScore, 0)}
            </span>
          </Field>
          {evo && (
            <Field label="Platform node ID">
              <KeyValue value={node.platformNodeId} />
            </Field>
          )}
        </dl>
      </Card>
      <Card title="Ownership and payments">
        <dl>
          <Field label="Payout">
            <AddressValue value={node.payee} />
          </Field>
          <Field label="Collateral">
            <AddressValue value={node.collateralAddress} />
          </Field>
          <Field label="Collateral outpoint">
            {collateral ? (
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <IdentifierLink kind="transaction" value={collateral[1]} />
                </div>
                <span className="shrink-0 tabular-nums">:{collateral[2]}</span>
              </div>
            ) : (
              <MissingApiData
                inline
                description="The collateral transaction hash and output index are needed. ProTxHash identifies registration, not necessarily the collateral transaction."
              />
            )}
          </Field>
          <Field label={ownerVotes ? "Owner, voting" : "Owner"}>
            <AddressValue value={node.ownerAddress} />
          </Field>
          {!ownerVotes && (
            <Field label="Voting">
              <AddressValue value={node.votingAddress} />
            </Field>
          )}
          <Field label="Operator key">
            <KeyValue value={node.pubKeyOperator} wrap />
          </Field>
        </dl>
      </Card>
    </div>
  );
}
