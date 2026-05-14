import { Link } from "@tanstack/react-router";
import { ChevronUp } from "lucide-react";
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
import { DUFFS_PER_DASH } from "@/lib/format";
import { CopyButton } from "@/themes/dash/components/copy-button";
import { HashCell } from "@/themes/dash/components/hash-cell";

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
  txType: number;
  payload: ApiExtraPayload | null | undefined;
}

export function ExtraPayloadCard({ txType, payload }: ExtraPayloadCardProps) {
  if (!payload) return null;
  return (
    <Card className="flex flex-col gap-3 border-0 px-6 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-muted-foreground">Extra Payload</h2>
        <ChevronUp className="size-4 text-muted-foreground" />
      </div>
      <div className="flex flex-col">{renderPayloadBody(txType, payload)}</div>
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
    case 5:
      return <CbTxBody p={payload as ApiCbTxPayload} />;
    case 6:
      return <QcTxBody p={payload as ApiQcTxPayload} />;
    case 7:
      return <MnHfTxBody p={payload as ApiMnHfTxPayload} />;
    case 8:
      return <AssetLockTxBody p={payload as ApiAssetLockTxPayload} />;
    case 9:
      return <AssetUnlockTxBody p={payload as ApiAssetUnlockTxPayload} />;
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
    <div className="flex min-w-0 items-center gap-1.5">
      <HashCell hash={value} />
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
        {height.toLocaleString()}
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

function DashValue({ duffs }: { duffs: number | string | null | undefined }) {
  if (duffs == null) return <Muted />;
  const num = typeof duffs === "string" ? Number(duffs) : duffs;
  if (!Number.isFinite(num)) return <Muted />;
  return (
    <span>
      <Bold>{(num / DUFFS_PER_DASH).toFixed(8)}</Bold>{" "}
      <span className="text-muted-foreground">DASH</span>
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

function CbTxBody({ p }: { p: ApiCbTxPayload }) {
  return (
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      <PayloadRow label="Height">
        <HeightPill height={p.height} />
      </PayloadRow>
      <PayloadRow label="Merkle Root MN List">
        <HexValue value={p.merkleRootMNList} />
      </PayloadRow>
      <PayloadRow label="Merkle Root Quorums">
        <HexValue value={p.merkleRootQuorums} />
      </PayloadRow>
      {p.bestCLHeightDiff != null ? (
        <PayloadRow label="Best CL Height Diff">
          <Bold>{p.bestCLHeightDiff}</Bold>
        </PayloadRow>
      ) : null}
      {p.bestCLSignature ? (
        <PayloadRow label="Best CL Signature" align="start">
          <HexValue value={p.bestCLSignature} />
        </PayloadRow>
      ) : null}
      {p.creditPoolBalance != null ? (
        <PayloadRow label="Credit Pool Balance">
          <DashValue duffs={p.creditPoolBalance} />
        </PayloadRow>
      ) : null}
    </>
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
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      {p.outputs?.map((out, idx) => {
        const num = Number(out.satoshis);
        const valueDash = Number.isFinite(num)
          ? (num / DUFFS_PER_DASH).toFixed(8)
          : "—";
        return (
          <NestedGroup
            key={`${out.script}-${idx}`}
            title={`Credit Output (${idx})`}
          >
            <PayloadRow label="Value">
              <span>
                <Bold>{valueDash}</Bold>{" "}
                <span className="text-muted-foreground">DASH</span>
              </span>
            </PayloadRow>
            <PayloadRow label="Value Sat">
              <Bold>{out.satoshis}</Bold>
            </PayloadRow>
            <div className="my-2 rounded-2xl bg-background/80 px-4 py-3">
              <div className="mb-1 text-xs text-muted-foreground">
                Script Pub Key
              </div>
              <PayloadRow label="Hex" align="start">
                <HexValue value={out.script} />
              </PayloadRow>
            </div>
          </NestedGroup>
        );
      })}
    </>
  );
}

function AssetUnlockTxBody({ p }: { p: ApiAssetUnlockTxPayload }) {
  return (
    <>
      <PayloadRow label="Version">
        <Bold>{p.version}</Bold>
      </PayloadRow>
      <PayloadRow label="Index">
        <Bold>{p.index}</Bold>
      </PayloadRow>
      <PayloadRow label="Fee">
        <Bold>{p.fee}</Bold>
      </PayloadRow>
      <PayloadRow label="Requested Height">
        <HeightPill height={p.requestedHeight} />
      </PayloadRow>
      <PayloadRow label="Quorum Hash">
        <HexValue value={p.quorumHash} />
      </PayloadRow>
      <PayloadRow label="Quorum Signature" align="start">
        <HexValue value={p.quorumSig} />
      </PayloadRow>
    </>
  );
}
