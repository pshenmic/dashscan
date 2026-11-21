import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Avatar } from "@/components/identicon";
import type { ApiMasternode } from "@/lib/api/types";
import { formatDateTime, getMnTypeLabel } from "@/lib/format";
import type { Network } from "@/lib/store";
import { metricNumber } from "@/themes/dash/lib/home-metrics";
import { BlockAge } from "./block-age";
import { CopyButton } from "./copy-button";
import { IdentifierLink } from "./identifier-link";
import { MasternodeVotes } from "./masternode-activity";
import {
  MasternodeStatusBadge,
  MasternodeTypeBadge,
} from "./masternode-badges";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2 border-b border-border/50 py-3 last:border-0 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="relative min-w-0 pe-8 text-sm sm:text-right [&_.dash-copy-control]:absolute [&_.dash-copy-control]:end-0 [&_.dash-copy-control]:top-1/2 [&_.dash-copy-control]:-translate-y-1/2">
        {children}
      </dd>
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
  href,
}: {
  value?: string | null;
  wrap?: boolean;
  href?: string;
}) {
  if (!value) return "—";
  return (
    <div className="flex min-w-0 items-center gap-2">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View validator ${value} in Platform Explorer (opens in a new tab)`}
          title={value}
          className="min-w-0 flex-1 truncate font-mono text-xs text-accent hover:underline"
        >
          {value}
        </a>
      ) : (
        <span
          title={value}
          className={`min-w-0 flex-1 font-mono text-xs ${wrap ? "break-all" : "truncate"}`}
        >
          {value}
        </span>
      )}
      <CopyButton value={value} />
    </div>
  );
}

function portLabel(port?: number | null) {
  return port != null && Number.isInteger(port) && port > 0 && port <= 65535
    ? port
    : "—";
}

export function MasternodeOverview({
  node,
  network,
}: {
  node: ApiMasternode;
  network: Network;
}) {
  const platformExplorer =
    network === "testnet"
      ? "https://testnet.platform-explorer.com"
      : "https://platform-explorer.com";
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
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Masternode profile">
          <div className="grid min-w-0 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_144px]">
            <dl className="min-w-0">
              <Field label="ProTxHash">
                <IdentifierLink kind="transaction" value={node.proTxHash} />
              </Field>
              <Field label="Registration">
                {registered ? (
                  <time dateTime={registered}>
                    {formatDateTime(registered)}
                  </time>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Last Core payment">
                {node.lastPaidBlock > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                    <Link
                      to="/blocks/$hashOrHeight"
                      params={{ hashOrHeight: String(node.lastPaidBlock) }}
                      className="text-accent hover:underline"
                    >
                      <span className="sr-only">Block </span>#
                      {metricNumber(node.lastPaidBlock, 0)}
                    </Link>
                    {node.lastPaidTime && Date.parse(node.lastPaidTime) > 0 && (
                      <span className="text-muted-foreground">
                        <BlockAge timestamp={node.lastPaidTime} />
                      </span>
                    )}
                  </div>
                ) : node.lastPaidBlock === 0 ? (
                  "Never"
                ) : (
                  "—"
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
              className="order-first flex min-w-0 flex-col items-center gap-3 py-3 sm:order-last"
            >
              <Avatar
                username={node.proTxHash}
                className="size-12 shrink-0 sm:size-[88px]"
              />
              <div className="grid w-full grid-cols-[1.5rem_minmax(0,auto)_1.5rem] items-center justify-center gap-1">
                <span className="col-start-2 break-all text-center font-mono text-xs">
                  {host || "—"}
                </span>
                {host && <CopyButton value={host} />}
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
                <KeyValue
                  value={node.platformNodeId}
                  href={`${platformExplorer}/validator/${node.proTxHash.toLowerCase()}`}
                />
              </Field>
            )}
          </dl>
        </Card>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
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
                  <span className="shrink-0 tabular-nums">
                    :{collateral[2]}
                  </span>
                </div>
              ) : (
                "—"
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
              {node.pubKeyOperator ? (
                <div className="flex min-w-0 items-center justify-end gap-2">
                  <span className="min-w-0 max-w-[48ch] break-all text-right font-mono text-xs">
                    {node.pubKeyOperator}
                  </span>
                  <CopyButton value={node.pubKeyOperator} />
                </div>
              ) : (
                "—"
              )}
            </Field>
          </dl>
        </Card>
        <MasternodeVotes network={network} hash={node.proTxHash} />
      </div>
    </div>
  );
}
