import { Link } from "@tanstack/react-router";
import { txTypeNum } from "@/lib/format";
import { Layers, Network, ShieldAlert, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { DashIcon } from "@/components/dash-icon";
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
import { CopyButton } from "@/themes/neo/components/copy-button";
import { DetailRow } from "@/themes/neo/components/detail-row";
import { HashDisplay } from "@/themes/neo/components/hash-display";
import { Badge } from "@/themes/neo/components/ui/badge";
import { Card, CardContent } from "@/themes/neo/components/ui/card";

const REVOCATION_REASONS: Record<number, string> = {
  0: "Not specified",
  1: "Termination of service",
  2: "Compromised keys",
  3: "Change of keys",
};

const LLMQ_TYPES: Record<number, string> = {
  1: "LLMQ_50_60",
  2: "LLMQ_400_60",
  3: "LLMQ_400_85",
  4: "LLMQ_100_67",
  5: "LLMQ_60_75",
  6: "LLMQ_25_67",
  100: "LLMQ_TEST",
  101: "LLMQ_DEVNET",
  102: "LLMQ_TEST_V17",
  103: "LLMQ_TEST_DIP0024",
  104: "LLMQ_TEST_INSTANTSEND",
  105: "LLMQ_DEVNET_DIP0024",
  106: "LLMQ_TEST_PLATFORM",
  107: "LLMQ_DEVNET_PLATFORM",
};

const PAYLOAD_META: Record<
  number,
  { name: string; tone: "violet" | "amber" | "cyan" | "emerald" | "rose" }
> = {
  1: { name: "ProRegTx", tone: "violet" },
  2: { name: "ProUpServTx", tone: "violet" },
  3: { name: "ProUpRegTx", tone: "violet" },
  4: { name: "ProUpRevTx", tone: "rose" },
  5: { name: "CbTx", tone: "amber" },
  6: { name: "QcTx", tone: "cyan" },
  7: { name: "MnHfTx", tone: "amber" },
  8: { name: "AssetLockTx", tone: "emerald" },
  9: { name: "AssetUnlockTx", tone: "emerald" },
};

const TONE_VARS: Record<string, string> = {
  violet: "var(--accent-violet, #8b5cf6)",
  amber: "var(--accent-amber, #f59e0b)",
  cyan: "var(--accent-cyan, #06b6d4)",
  emerald: "var(--success, #10b981)",
  rose: "var(--destructive, #f43f5e)",
};

interface ExtraPayloadSectionProps {
  txType: string | number | null | undefined;
  payload: ApiExtraPayload | null | undefined;
}

export function ExtraPayloadSection({
  txType,
  payload,
}: ExtraPayloadSectionProps) {
  if (!payload) return null;
  const typeNum = txTypeNum(txType);
  const meta = PAYLOAD_META[typeNum];
  const accent = TONE_VARS[meta?.tone ?? "violet"];
  const Icon = iconFor(typeNum);

  return (
    <Card className="overflow-hidden">
      <div
        className="relative px-5 py-4 sm:px-6"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 14%, transparent) 0%, color-mix(in oklab, ${accent} 4%, transparent) 60%, transparent 100%)`,
          borderBottom: `1px solid color-mix(in oklab, ${accent} 22%, var(--border))`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `color-mix(in oklab, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            <Icon className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Extra Payload
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              {meta?.name ?? "Unknown payload"}
            </span>
          </div>
          <Badge
            variant="outline"
            className="ml-auto font-mono text-[10px] tabular-nums"
            style={{
              color: accent,
              borderColor: `color-mix(in oklab, ${accent} 38%, var(--border))`,
              background: `color-mix(in oklab, ${accent} 10%, transparent)`,
            }}
          >
            DIP-2 · type {typeNum}
          </Badge>
        </div>
      </div>
      <CardContent className="grid gap-x-12 gap-y-4 pt-5 lg:grid-cols-2">
        {renderBody(typeNum, payload)}
      </CardContent>
    </Card>
  );
}

function iconFor(txType: number): React.ComponentType<{ className?: string }> {
  switch (txType) {
    case 1:
    case 2:
    case 3:
      return Network;
    case 4:
      return ShieldAlert;
    case 5:
      return Trophy;
    default:
      return Layers;
  }
}

function renderBody(txType: number, payload: ApiExtraPayload) {
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
        <span className="text-sm text-muted-foreground">
          Unrecognized extra payload type.
        </span>
      );
  }
}

function Muted() {
  return <span className="text-muted-foreground">—</span>;
}

function Hex({ value }: { value: string | null | undefined }) {
  if (!value) return <Muted />;
  return <HashDisplay value={value} head={10} tail={8} />;
}

function HexPlain({ value }: { value: string | null | undefined }) {
  if (!value) return <Muted />;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <code className="font-mono text-xs tabular-nums break-all">
        {value.length > 24
          ? `${value.slice(0, 12)}…${value.slice(-10)}`
          : value}
      </code>
      <CopyButton value={value} />
    </span>
  );
}

function TxLink({ hash }: { hash: string | null | undefined }) {
  if (!hash) return <Muted />;
  return (
    <HashDisplay value={hash} href="/transactions/$hash" params={{ hash }} />
  );
}

function BlockLink({ height }: { height: number | null | undefined }) {
  if (height == null) return <Muted />;
  return (
    <Link
      to="/blocks/$hashOrHeight"
      params={{ hashOrHeight: String(height) }}
      className="font-mono text-sm tabular-nums text-accent hover:underline"
    >
      #{height.toLocaleString()}
    </Link>
  );
}

function Num({ value }: { value: number | string | null | undefined }) {
  if (value == null || value === "") return <Muted />;
  return <span className="font-mono text-sm tabular-nums">{value}</span>;
}

function Service({ ip, port }: { ip: string; port: number }) {
  if (!ip) return <Muted />;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums">
      <span>{ip}</span>
      <span className="text-[var(--accent,#4c7eff)]">:{port}</span>
      <span className="size-1.5 rounded-full bg-emerald-500" />
    </span>
  );
}

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

function DashAmount({ duffs }: { duffs: number | string | null | undefined }) {
  if (duffs == null) return <Muted />;
  const num = typeof duffs === "string" ? Number(duffs) : duffs;
  if (!Number.isFinite(num)) return <Muted />;
  return (
    <span className="font-mono text-sm tabular-nums">
      {(num / 1e8).toFixed(8)} <DashIcon />
    </span>
  );
}

function Pct({ basisPoints }: { basisPoints: number }) {
  return (
    <span className="font-mono text-sm tabular-nums">
      {(basisPoints / 100).toFixed(2)}%
    </span>
  );
}

function Section({ children, title }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      {title ? (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <dl className="grid gap-y-4">{children}</dl>
    </section>
  );
}

function ProRegTxBody({ p }: { p: ApiProRegTxPayload }) {
  const hasPlatform = !!p.platformNodeID;
  return (
    <>
      <Section title="Identity">
        <DetailRow label="Version">
          <Num value={p.version} />
        </DetailRow>
        <DetailRow label="MN Type">
          <Num value={p.type} />
        </DetailRow>
        <DetailRow label="Mode">
          <Num value={p.mode} />
        </DetailRow>
        <DetailRow label="Collateral Tx">
          <TxLink hash={p.collateralOutpoint?.txId} />
        </DetailRow>
        <DetailRow label="Collateral Output">
          <Num value={p.collateralOutpoint?.vOut} />
        </DetailRow>
        <DetailRow label="Service">
          <Service ip={p.ipAddress} port={p.port} />
        </DetailRow>
        <DetailRow label="Operator Reward">
          <Pct basisPoints={p.operatorReward} />
        </DetailRow>
      </Section>
      <Section title="Keys & Signatures">
        <DetailRow label="Owner Key">
          <HexPlain value={p.keyIdOwner} />
        </DetailRow>
        <DetailRow label="Voting Key">
          <HexPlain value={p.keyIdVoting} />
        </DetailRow>
        <DetailRow label="Operator PubKey">
          <HexPlain value={p.pubKeyOperator} />
        </DetailRow>
        <DetailRow label="Payout Script">
          <HexPlain value={p.scriptPayout} />
        </DetailRow>
        <DetailRow label="Inputs Hash">
          <Hex value={p.inputsHash} />
        </DetailRow>
        <DetailRow label="Payload Signature">
          <HexPlain value={p.payloadSig} />
        </DetailRow>
        {hasPlatform ? (
          <>
            <DetailRow label="Platform Node ID">
              <HexPlain value={p.platformNodeID} />
            </DetailRow>
            <DetailRow label="Platform P2P / HTTP">
              <span className="font-mono text-sm tabular-nums">
                {p.platformP2PPort}
                <span className="text-muted-foreground"> / </span>
                {p.platformHTTPPort}
              </span>
            </DetailRow>
          </>
        ) : null}
      </Section>
    </>
  );
}

function ProUpServTxBody({ p }: { p: ApiProUpServTxPayload }) {
  const hasPlatform = !!p.platformNodeID;
  return (
    <>
      <Section title="Target">
        <DetailRow label="Version">
          <Num value={p.version} />
        </DetailRow>
        <DetailRow label="MN Type">
          <Num value={p.type} />
        </DetailRow>
        <DetailRow label="ProRegTx Hash">
          <TxLink hash={p.proTxHash} />
        </DetailRow>
        <DetailRow label="Service">
          <Service ip={p.ipAddress} port={p.port} />
        </DetailRow>
      </Section>
      <Section title="Keys & Signatures">
        <DetailRow label="Operator Payout">
          <HexPlain value={p.scriptOperatorPayout} />
        </DetailRow>
        <DetailRow label="Inputs Hash">
          <Hex value={p.inputsHash} />
        </DetailRow>
        <DetailRow label="Payload Signature">
          <HexPlain value={p.payloadSig} />
        </DetailRow>
        {hasPlatform ? (
          <>
            <DetailRow label="Platform Node ID">
              <HexPlain value={p.platformNodeID} />
            </DetailRow>
            <DetailRow label="Platform P2P / HTTP">
              <span className="font-mono text-sm tabular-nums">
                {p.platformP2PPort}
                <span className="text-muted-foreground"> / </span>
                {p.platformHTTPPort}
              </span>
            </DetailRow>
          </>
        ) : null}
      </Section>
    </>
  );
}

function ProUpRegTxBody({ p }: { p: ApiProUpRegTxPayload }) {
  return (
    <>
      <Section title="Target">
        <DetailRow label="Version">
          <Num value={p.version} />
        </DetailRow>
        <DetailRow label="ProRegTx Hash">
          <TxLink hash={p.proTxHash} />
        </DetailRow>
        <DetailRow label="Mode">
          <Num value={p.mode} />
        </DetailRow>
      </Section>
      <Section title="Keys & Signatures">
        <DetailRow label="Voting Key">
          <HexPlain value={p.keyIdVoting} />
        </DetailRow>
        <DetailRow label="Operator PubKey">
          <HexPlain value={p.pubKeyOperator} />
        </DetailRow>
        <DetailRow label="Payout Script">
          <HexPlain value={p.scriptPayout} />
        </DetailRow>
        <DetailRow label="Inputs Hash">
          <Hex value={p.inputsHash} />
        </DetailRow>
        <DetailRow label="Payload Signature">
          <HexPlain value={p.payloadSig} />
        </DetailRow>
      </Section>
    </>
  );
}

function ProUpRevTxBody({ p }: { p: ApiProUpRevTxPayload }) {
  const reasonLabel = REVOCATION_REASONS[p.reason] ?? `Reason ${p.reason}`;
  return (
    <>
      <Section title="Target">
        <DetailRow label="Version">
          <Num value={p.version} />
        </DetailRow>
        <DetailRow label="ProRegTx Hash">
          <TxLink hash={p.proTxHash} />
        </DetailRow>
        <DetailRow label="Reason">
          <Badge variant="outline">
            {p.reason} · {reasonLabel}
          </Badge>
        </DetailRow>
      </Section>
      <Section title="Signatures">
        <DetailRow label="Inputs Hash">
          <Hex value={p.inputsHash} />
        </DetailRow>
        <DetailRow label="Payload Signature">
          <HexPlain value={p.payloadSig} />
        </DetailRow>
      </Section>
    </>
  );
}

function CbTxBody({ p }: { p: ApiCbTxPayload }) {
  return (
    <>
      <Section title="Block Context">
        <DetailRow label="Version">
          <Num value={p.version} />
        </DetailRow>
        <DetailRow label="Block Height">
          <BlockLink height={p.height} />
        </DetailRow>
        {p.creditPoolBalance != null ? (
          <DetailRow label="Credit Pool">
            <DashAmount duffs={p.creditPoolBalance} />
          </DetailRow>
        ) : null}
        {p.bestCLHeightDiff != null ? (
          <DetailRow label="Best CL Height Diff">
            <Num value={p.bestCLHeightDiff} />
          </DetailRow>
        ) : null}
      </Section>
      <Section title="Merkle & Signatures">
        <DetailRow label="MN List Merkle">
          <Hex value={p.merkleRootMNList} />
        </DetailRow>
        <DetailRow label="Quorums Merkle">
          <Hex value={p.merkleRootQuorums} />
        </DetailRow>
        {p.bestCLSignature ? (
          <DetailRow label="Best CL Signature">
            <HexPlain value={p.bestCLSignature} />
          </DetailRow>
        ) : null}
      </Section>
    </>
  );
}

function QcTxBody({ p }: { p: ApiQcTxPayload }) {
  const c = p.commitment;
  const llmqLabel = LLMQ_TYPES[c.llmqType] ?? `Type ${c.llmqType}`;
  return (
    <>
      <Section title="Commitment">
        <DetailRow label="Tx Version">
          <Num value={p.version} />
        </DetailRow>
        <DetailRow label="Block Height">
          <BlockLink height={p.height} />
        </DetailRow>
        <DetailRow label="Commitment Version">
          <Num value={c.version} />
        </DetailRow>
        <DetailRow label="LLMQ Type">
          <span className="font-mono text-sm tabular-nums">{c.llmqType}</span>
          <Badge variant="outline" className="text-xs">
            {llmqLabel}
          </Badge>
        </DetailRow>
        <DetailRow label="Quorum Hash">
          <Hex value={c.quorumHash} />
        </DetailRow>
        {c.quorumIndex != null ? (
          <DetailRow label="Quorum Index">
            <Num value={c.quorumIndex} />
          </DetailRow>
        ) : null}
      </Section>
      <Section title="Members & Signatures">
        <DetailRow label="Signers Count">
          <Num value={countBitsSet(c.signers)} />
        </DetailRow>
        <DetailRow label="Valid Members Count">
          <Num value={countBitsSet(c.validMembers)} />
        </DetailRow>
        <DetailRow label="Quorum PubKey">
          <HexPlain value={c.quorumPublicKey} />
        </DetailRow>
        <DetailRow label="Quorum Vvec Hash">
          <Hex value={c.quorumVvecHash} />
        </DetailRow>
        <DetailRow label="Quorum Signature">
          <HexPlain value={c.quorumSig} />
        </DetailRow>
        <DetailRow label="Member Signature">
          <HexPlain value={c.sig} />
        </DetailRow>
      </Section>
    </>
  );
}

function MnHfTxBody({ p }: { p: ApiMnHfTxPayload }) {
  return (
    <Section>
      <DetailRow label="Version">
        <Num value={p.version} />
      </DetailRow>
      <DetailRow label="Version Bit">
        <Num value={p.commitment.versionBit} />
      </DetailRow>
      <DetailRow label="Quorum Hash">
        <Hex value={p.commitment.quorumHash} />
      </DetailRow>
      <DetailRow label="Signature">
        <HexPlain value={p.commitment.sig} />
      </DetailRow>
    </Section>
  );
}

function AssetLockTxBody({ p }: { p: ApiAssetLockTxPayload }) {
  return (
    <>
      <Section title="Lock">
        <DetailRow label="Version">
          <Num value={p.version} />
        </DetailRow>
        <DetailRow label="Output Count">
          <Num value={p.count} />
        </DetailRow>
      </Section>
      <Section title="Credit Outputs">
        {p.outputs?.length ? (
          <ul className="flex flex-col gap-2">
            {p.outputs.map((out, idx) => (
              <li
                key={`${out.script}-${idx}`}
                className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Output #{idx}
                  </span>
                  <DashAmount duffs={out.satoshis} />
                </div>
                <div className="mt-1.5">
                  <HexPlain value={out.script} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-muted-foreground">No outputs</span>
        )}
      </Section>
    </>
  );
}

function AssetUnlockTxBody({ p }: { p: ApiAssetUnlockTxPayload }) {
  return (
    <>
      <Section title="Unlock">
        <DetailRow label="Version">
          <Num value={p.version} />
        </DetailRow>
        <DetailRow label="Index">
          <Num value={p.index} />
        </DetailRow>
        <DetailRow label="Fee">
          <DashAmount duffs={p.fee} />
        </DetailRow>
        <DetailRow label="Requested Height">
          <BlockLink height={p.requestedHeight} />
        </DetailRow>
      </Section>
      <Section title="Quorum">
        <DetailRow label="Quorum Hash">
          <Hex value={p.quorumHash} />
        </DetailRow>
        <DetailRow label="Quorum Signature">
          <HexPlain value={p.quorumSig} />
        </DetailRow>
      </Section>
    </>
  );
}
