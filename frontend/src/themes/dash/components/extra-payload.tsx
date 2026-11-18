import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type {
  ApiAssetLockTxPayload,
  ApiAssetUnlockTxPayload,
  ApiCbTxPayload,
  ApiExtraPayload,
  ApiMnHfTxPayload,
  ApiProRegTxPayload,
  ApiProUpRegTxPayload,
  ApiProUpRevTxPayload,
  ApiProUpServTxPayload,
  ApiQcTxPayload,
} from "@/lib/api/types";
import { formatNumber, txTypeNum } from "@/lib/format";
import { CopyButton } from "@/themes/dash/components/copy-button";
import { HashCell } from "@/themes/dash/components/hash-cell";
import { TransactionAmount } from "@/themes/dash/components/transaction-amount";
import { transactionAmount } from "@/themes/dash/lib/transaction-detail";

const REVOCATION_REASONS: Record<number, string> = {
  0: "Not specified",
  1: "Termination of service",
  2: "Compromised keys",
  3: "Change of keys",
};

function countBitsSet(hex: string | null | undefined): number {
  if (!hex) return 0;
  let count = 0;
  const lookup = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
  for (let i = 0; i < hex.length; i++) {
    const v = Number.parseInt(hex[i], 16);
    if (Number.isFinite(v)) count += lookup[v] ?? 0;
  }
  return count;
}

interface ExtraPayloadCardProps {
  blockHeight?: number;
  txType: string | number | null | undefined;
  payload: ApiExtraPayload | null | undefined;
}

export function ExtraPayloadCard({
  txType,
  payload,
  blockHeight,
}: ExtraPayloadCardProps) {
  if (!payload) return null;
  const typeNum = txTypeNum(txType);
  if (typeNum === 5 && "merkleRootMNList" in payload)
    return <CoinbasePayload p={payload} blockHeight={blockHeight} />;
  if (typeNum === 8 && "outputs" in payload)
    return <AssetLockTxBody p={payload} />;
  if (typeNum === 9 && "requestedHeight" in payload)
    return <AssetUnlockTxBody p={payload} />;
  return (
    <Card className="flex flex-col gap-3 border-0 px-6 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-muted-foreground">Extra Payload</h2>
      </div>
      <div className="flex flex-col">{renderPayloadBody(typeNum, payload)}</div>
    </Card>
  );
}

function renderPayloadBody(txType: number, payload: ApiExtraPayload) {
  switch (txType) {
    case 1:
      return <ProRegTxBody p={payload as ApiProRegTxPayload} />;
    case 2:
      return <ProUpServTxBody p={payload as ApiProUpServTxPayload} />;
    case 3:
      return <ProUpRegTxBody p={payload as ApiProUpRegTxPayload} />;
    case 4:
      return <ProUpRevTxBody p={payload as ApiProUpRevTxPayload} />;
    case 6:
      return <QcTxBody p={payload as ApiQcTxPayload} />;
    case 7:
      return <MnHfTxBody p={payload as ApiMnHfTxPayload} />;
    default:
      return (
        <span className="text-xs text-muted-foreground">
          Unrecognized payload.
        </span>
      );
  }
}

function PayloadRow({
  label,
  children,
  align = "center",
}: {
  label: string;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={`flex gap-6 py-2.5 ${
        align === "start" ? "items-start" : "items-center"
      }`}
    >
      <span className="min-w-36 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center text-xs">{children}</div>
    </div>
  );
}

function NestedGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="my-2 rounded-2xl bg-secondary/60 px-4 py-3">
      <div className="mb-1 text-xs text-muted-foreground">{title}</div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Bold({ children }: { children: ReactNode }) {
  return <span className="font-bold">{children}</span>;
}

function Muted() {
  return <span className="text-muted-foreground">—</span>;
}

function HexValue({ value }: { value: string | null | undefined }) {
  if (!value) return <Muted />;
  return (
    <div className="group flex min-w-0 items-center gap-1.5">
      <span className="dash-data-mono truncate" title={value}>
        {value}
      </span>
      <CopyButton value={value} />
    </div>
  );
}

function AddressPill({ address }: { address: string | null | undefined }) {
  if (!address) return <Muted />;
  return (
    <Link
      to="/address/$address"
      params={{ address }}
      className="group inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 transition-colors hover:bg-accent/20"
    >
      <HashCell hash={address} accent />
      <CopyButton value={address} />
    </Link>
  );
}

function HeightPill({ height }: { height: number | null | undefined }) {
  if (height == null) return <Muted />;
  return (
    <Link
      to="/blocks/$hashOrHeight"
      params={{ hashOrHeight: String(height) }}
      className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 transition-colors hover:bg-accent/10"
    >
      <span className="font-mono font-bold text-foreground">
        {formatNumber(height)}
      </span>
      <CopyButton value={String(height)} />
    </Link>
  );
}

function TxHashLink({ hash }: { hash: string | null | undefined }) {
  if (!hash) return <Muted />;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Link
        to="/transactions/$hash"
        params={{ hash }}
        className="font-mono hover:underline"
      >
        <HashCell hash={hash} accent />
      </Link>
      <CopyButton value={hash} />
    </div>
  );
}

function ServiceValue({ ip, port }: { ip: string; port: number }) {
  if (!ip) return <Muted />;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-bold">
      <span>{ip}</span>
      <span className="text-accent">:{port}</span>
      <span className="size-1.5 rounded-full bg-emerald-500" />
    </span>
  );
}

function PercentValue({ basisPoints }: { basisPoints: number }) {
  const pct = basisPoints / 100;
  const text = Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
  return <Bold>{text}</Bold>;
}

function ProRegTxBody({ p }: { p: ApiProRegTxPayload }) {
  return (
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      <PayloadRow label="Type">
        <Bold>{p.type}</Bold>
      </PayloadRow>
      <PayloadRow label="Collateral Hash">
        <TxHashLink hash={p.collateralOutpoint?.txId} />
      </PayloadRow>
      <PayloadRow label="Collateral Index">
        <Bold>{p.collateralOutpoint?.vOut ?? "—"}</Bold>
      </PayloadRow>
      <PayloadRow label="Service">
        <ServiceValue ip={p.ipAddress} port={p.port} />
      </PayloadRow>
      <PayloadRow label="Owner Address">
        <AddressPill address={p.keyIdOwner} />
      </PayloadRow>
      <PayloadRow label="Voting Address">
        <AddressPill address={p.keyIdVoting} />
      </PayloadRow>
      <PayloadRow label="Payout Address">
        <AddressPill address={p.scriptPayout} />
      </PayloadRow>
      <PayloadRow label="Operator reward">
        <PercentValue basisPoints={p.operatorReward} />
      </PayloadRow>
    </>
  );
}

function ProUpServTxBody({ p }: { p: ApiProUpServTxPayload }) {
  return (
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      <PayloadRow label="Type">
        <Bold>{p.type}</Bold>
      </PayloadRow>
      <PayloadRow label="Pro Tx Hash">
        <HexValue value={p.proTxHash} />
      </PayloadRow>
      <PayloadRow label="Service">
        <ServiceValue ip={p.ipAddress} port={p.port} />
      </PayloadRow>
    </>
  );
}

function ProUpRegTxBody({ p }: { p: ApiProUpRegTxPayload }) {
  return (
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      <PayloadRow label="Pro Tx Hash">
        <HexValue value={p.proTxHash} />
      </PayloadRow>
      <PayloadRow label="Voting Address">
        <AddressPill address={p.keyIdVoting} />
      </PayloadRow>
      <PayloadRow label="Payout Address">
        <AddressPill address={p.scriptPayout} />
      </PayloadRow>
    </>
  );
}

function ProUpRevTxBody({ p }: { p: ApiProUpRevTxPayload }) {
  const reasonLabel = REVOCATION_REASONS[p.reason] ?? `Reason ${p.reason}`;
  return (
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      <PayloadRow label="Pro Tx Hash">
        <HexValue value={p.proTxHash} />
      </PayloadRow>
      <PayloadRow label="Reason">
        <span>
          <Bold>{p.reason}</Bold>{" "}
          <span className="text-muted-foreground">· {reasonLabel}</span>
        </span>
      </PayloadRow>
    </>
  );
}

function CoinbasePayload({
  p,
  blockHeight,
}: {
  p: ApiCbTxPayload;
  blockHeight?: number;
}) {
  const diff = transactionAmount(p.bestCLHeightDiff);
  const hasSignature = Boolean(
    p.bestCLSignature && !/^0+$/.test(p.bestCLSignature),
  );
  const signedHeight =
    hasSignature &&
    diff != null &&
    Number.isSafeInteger(p.height) &&
    p.height > diff
      ? p.height - diff - 1
      : null;
  return (
    <Card className="min-w-0 gap-4 rounded-3xl p-4 sm:p-6">
      <div
        className={
          p.creditPoolBalance != null || hasSignature
            ? "grid gap-5 lg:grid-cols-2"
            : undefined
        }
      >
        {(p.creditPoolBalance != null || hasSignature) && (
          <div className="flex min-w-0 flex-col gap-3">
            {p.creditPoolBalance != null && (
              <section className="min-w-0 space-y-2">
                <h2 className="text-xl font-extrabold">Credit pool balance</h2>
                <p className="wrap-anywhere text-2xl font-bold tabular-nums sm:text-3xl">
                  <TransactionAmount
                    value={transactionAmount(p.creditPoolBalance)}
                  />
                </p>
              </section>
            )}
            {hasSignature && p.bestCLSignature && (
              <section className="mt-auto grid min-w-0 gap-1">
                <h2 className="text-sm font-semibold">
                  ChainLock
                  {signedHeight != null && (
                    <>
                      {" "}
                      for{" "}
                      <Link
                        to="/blocks/$hashOrHeight"
                        params={{ hashOrHeight: String(signedHeight) }}
                        className="text-accent hover:underline"
                      >
                        #{formatNumber(signedHeight)}
                      </Link>
                    </>
                  )}
                </h2>
                <div className="min-w-0 text-xs">
                  <HexValue value={p.bestCLSignature} />
                </div>
              </section>
            )}
          </div>
        )}
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="text-xl font-extrabold">Merkle roots</h2>
          <dl className="mt-auto grid gap-x-3 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)]">
            {[
              ["Masternode list", p.merkleRootMNList],
              ["Quorums", p.merkleRootQuorums],
              ["Asset unlocks", p.merkleRootAssetUnlocks],
            ].map(
              ([label, value]) =>
                value != null && (
                  <div
                    key={label}
                    className="grid min-w-0 gap-y-0.5 sm:col-span-2 sm:grid-cols-subgrid sm:items-center"
                  >
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 text-xs">
                      <HexValue value={value} />
                    </dd>
                  </div>
                ),
            )}
          </dl>
        </section>
      </div>
      {(p.height !== blockHeight || (signedHeight == null && diff != null)) && (
        <div className="flex flex-wrap items-center gap-x-4 text-xs text-muted-foreground">
          {p.height !== blockHeight && (
            <span>
              Payload height <HeightPill height={p.height} />
            </span>
          )}
          {signedHeight == null && diff != null && (
            <span>ChainLock height difference: {formatNumber(diff)}</span>
          )}
        </div>
      )}
    </Card>
  );
}

function QcTxBody({ p }: { p: ApiQcTxPayload }) {
  const c = p.commitment;
  return (
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      <PayloadRow label="Height">
        <HeightPill height={p.height} />
      </PayloadRow>
      <NestedGroup title="Commitment">
        <PayloadRow label="Version">
          <Bold>{c.version}</Bold>
        </PayloadRow>
        <PayloadRow label="llmq Type">
          <Bold>{c.llmqType}</Bold>
        </PayloadRow>
        <PayloadRow label="Quorum Hash">
          <HexValue value={c.quorumHash} />
        </PayloadRow>
        {c.quorumIndex != null ? (
          <PayloadRow label="Quorum Index">
            <Bold>{c.quorumIndex}</Bold>
          </PayloadRow>
        ) : null}
        <PayloadRow label="Signers Count">
          <Bold>{countBitsSet(c.signers)}</Bold>
        </PayloadRow>
        <PayloadRow label="Valid Members Count">
          <Bold>{countBitsSet(c.validMembers)}</Bold>
        </PayloadRow>
        <PayloadRow label="Quorum Public Key" align="start">
          <HexValue value={c.quorumPublicKey} />
        </PayloadRow>
        <PayloadRow label="Quorum Vvec Hash" align="start">
          <HexValue value={c.quorumVvecHash} />
        </PayloadRow>
        <PayloadRow label="Quorum Signature" align="start">
          <HexValue value={c.quorumSig} />
        </PayloadRow>
        <PayloadRow label="Member Signature" align="start">
          <HexValue value={c.sig} />
        </PayloadRow>
      </NestedGroup>
    </>
  );
}

function MnHfTxBody({ p }: { p: ApiMnHfTxPayload }) {
  return (
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      <NestedGroup title="Signal">
        <PayloadRow label="Version Bit">
          <Bold>{p.commitment.versionBit}</Bold>
        </PayloadRow>
        <PayloadRow label="Quorum Hash">
          <HexValue value={p.commitment.quorumHash} />
        </PayloadRow>
        <PayloadRow label="Signature" align="start">
          <HexValue value={p.commitment.sig} />
        </PayloadRow>
      </NestedGroup>
    </>
  );
}

function AssetLockTxBody({ p }: { p: ApiAssetLockTxPayload }) {
  return (
    <Card className="min-w-0 gap-3 rounded-3xl p-4 sm:p-6">
      <h2 className="text-xl font-extrabold">DASH locked for Platform</h2>
      {p.outputs?.length ? (
        <ol className="divide-y divide-border">
          {p.outputs.map((output, index) => {
            const keyHash =
              /^OP_DUP OP_HASH160 (?:OP_PUSHBYTES_20 )?([a-f0-9]{40}) OP_EQUALVERIFY OP_CHECKSIG$/i.exec(
                output.script,
              )?.[1];
            return (
              <li
                key={`${index}-${output.script}`}
                className="grid min-w-0 gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-2"
              >
                <div>
                  <h3 className="text-xs text-muted-foreground">
                    {p.outputs.length === 1
                      ? "Locked amount"
                      : `Credit output #${index}`}
                  </h3>
                  <p className="text-lg font-bold">
                    <TransactionAmount
                      value={transactionAmount(output.satoshis)}
                    />
                  </p>
                </div>
                <div className="min-w-0 text-xs">
                  <p className="mb-1 text-muted-foreground">
                    {keyHash ? "Public key hash" : "Locking script"}
                  </p>
                  <HexValue value={keyHash ?? output.script} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          No credit outputs available.
        </p>
      )}
    </Card>
  );
}

function AssetUnlockTxBody({ p }: { p: ApiAssetUnlockTxPayload }) {
  return (
    <Card className="grid min-w-0 gap-5 rounded-3xl p-4 sm:p-6 lg:grid-cols-2">
      <section className="min-w-0 space-y-2">
        <h2 className="text-xl font-extrabold">Unlock request</h2>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Unlock index</dt>
          <dd className="tabular-nums">{p.index}</dd>
          <dt className="text-muted-foreground">Requested height</dt>
          <dd>
            <Link
              to="/blocks/$hashOrHeight"
              params={{ hashOrHeight: String(p.requestedHeight) }}
              className="text-accent hover:underline"
            >
              #{formatNumber(p.requestedHeight)}
            </Link>
          </dd>
          <dt className="text-muted-foreground">Unlock fee</dt>
          <dd>
            <TransactionAmount value={transactionAmount(p.fee)} />
          </dd>
        </dl>
      </section>
      <section className="min-w-0 space-y-2">
        <h2 className="text-xl font-extrabold">Quorum</h2>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Hash</dt>
          <dd className="min-w-0 text-xs">
            <HexValue value={p.quorumHash} />
          </dd>
          <dt className="text-muted-foreground">Signature</dt>
          <dd className="min-w-0 text-xs">
            <HexValue value={p.quorumSig} />
          </dd>
        </dl>
      </section>
    </Card>
  );
}
