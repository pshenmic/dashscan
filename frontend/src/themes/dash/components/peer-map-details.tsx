import { Check, ListFilter } from "lucide-react";
import { Badge } from "@/components/explorer/ui/badge";
import type { ApiPeer } from "@/lib/api/peers";
import { formatNumber } from "@/lib/format";
import { peerCountries } from "@/themes/dash/lib/network-metrics";

export function PeerMapDetails({
  peers,
  selectedCountry,
  onCountryChange,
  onShowInTable,
}: {
  peers: ApiPeer[];
  selectedCountry: string | null;
  onCountryChange: (code: string | null) => void;
  onShowInTable: (peer: ApiPeer) => void;
}) {
  const peer = peers.length === 1 ? peers[0] : undefined;
  const available = peers.filter((item) => item.available).length;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {peer ? (
          <>
            <button
              type="button"
              onClick={() => onShowInTable(peer)}
              title="Show in table"
              aria-label={`Show ${peer.address} in table`}
              className="min-w-0 break-all rounded-sm text-left font-mono text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {peer.address === peer.host
                ? `${peer.host.includes(":") && !peer.host.startsWith("[") ? `[${peer.host}]` : peer.host}:${peer.port}`
                : peer.address}
            </button>
            <Badge variant={peer.available ? "soft-success" : "soft"}>
              {peer.available ? "Available" : "Unconfirmed"}
            </Badge>
          </>
        ) : (
          <>
            <strong className="w-full text-sm">
              {formatNumber(peers.length)} peers
            </strong>
            <Badge variant="soft-success">
              Available {formatNumber(available)}
            </Badge>
            <Badge variant="soft">
              Unconfirmed {formatNumber(peers.length - available)}
            </Badge>
          </>
        )}
      </div>
      <ul
        aria-label="Country filters"
        className="max-h-36 overflow-y-auto border-t border-border pt-1"
      >
        {peerCountries(peers).map(({ code, name, nodes }) => {
          const selected = selectedCountry === code;
          const Icon = selected ? Check : ListFilter;
          return (
            <li key={code}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`Filter by ${name}`}
                onClick={() => onCountryChange(selected ? null : code)}
                className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-accent hover:bg-action-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-pressed:bg-action-subtle"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 break-words">
                  {name}
                  {peer?.geo?.city?.trim() && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {peer.geo.city.trim()}
                    </span>
                  )}
                </span>
                {!peer && (
                  <span className="tabular-nums">
                    {formatNumber(nodes.length)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
