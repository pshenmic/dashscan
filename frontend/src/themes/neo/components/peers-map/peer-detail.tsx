import { ArrowLeft, CircleCheck, Server, ServerCrash } from "lucide-react";
import { type ApiPeer, decodeServices } from "@/lib/api/peers";
import { formatRelativeTime } from "@/lib/format";
import { CopyButton } from "@/themes/neo/components/copy-button";
import { DetailRow } from "@/themes/neo/components/detail-row";
import { Badge } from "@/themes/neo/components/ui/badge";
import { countryFlagEmoji, formatLocation } from "../masternode-map/iso-codes";

function TimeValue({ value }: { value: string }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <>
      <span className="font-mono text-xs">{date.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">
        ({formatRelativeTime(value)})
      </span>
    </>
  );
}

export function PeerDetail({
  peer,
  maxHeight,
  onBack,
}: {
  peer: ApiPeer;
  maxHeight: number;
  onBack: () => void;
}) {
  const services = decodeServices(peer.services);
  const geo = peer.geo;

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>

      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none" aria-hidden="true">
          {geo ? countryFlagEmoji(geo.countryCode) : "🌐"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5 break-all font-mono text-sm font-medium">
            <Server className="size-3.5 shrink-0 text-muted-foreground" />
            {peer.address}
            <CopyButton value={peer.address} label="Peer address" />
          </span>
          <Badge
            variant={peer.available ? "soft-success" : "soft-destructive"}
            className="w-fit"
          >
            {peer.available ? (
              <CircleCheck className="size-3" />
            ) : (
              <ServerCrash className="size-3" />
            )}
            {peer.available ? "Available" : "Unavailable"}
          </Badge>
        </div>
      </div>

      <dl
        className="flex flex-col gap-3 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        <DetailRow label="Host">
          <span className="break-all font-mono text-sm">{peer.host}</span>
        </DetailRow>
        <DetailRow label="Port">
          <span className="font-mono text-sm tabular-nums">{peer.port}</span>
        </DetailRow>
        <DetailRow label="Location">
          <span>{geo ? formatLocation(geo) : "—"}</span>
        </DetailRow>
        {geo && (
          <DetailRow label="Coordinates">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)}
            </span>
          </DetailRow>
        )}
        <DetailRow label="User Agent">
          {peer.userAgent ? (
            <span className="break-all font-mono text-xs">
              {peer.userAgent}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </DetailRow>
        <DetailRow label="Protocol Version">
          <span className="font-mono text-sm tabular-nums">
            {peer.protocolVersion ?? "—"}
          </span>
        </DetailRow>
        <DetailRow label="Start Height">
          <span className="font-mono text-sm tabular-nums">
            {peer.startHeight != null ? peer.startHeight.toLocaleString() : "—"}
          </span>
        </DetailRow>
        <DetailRow label="Services">
          {peer.services == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-1">
                {services.names.map((name) => (
                  <Badge key={name} variant="secondary" className="font-mono">
                    {name}
                  </Badge>
                ))}
                {services.unknownBits.map((bit) => (
                  <Badge
                    key={`bit-${bit}`}
                    variant="outline"
                    className="font-mono text-muted-foreground"
                  >
                    bit {bit}
                  </Badge>
                ))}
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {peer.services} · 0x{peer.services.toString(16)}
              </span>
            </div>
          )}
        </DetailRow>
        <DetailRow label="Last Seen">
          <TimeValue value={peer.lastSeen} />
        </DetailRow>
        <DetailRow label="Probed At">
          <TimeValue value={peer.probedAt} />
        </DetailRow>
      </dl>
    </div>
  );
}
