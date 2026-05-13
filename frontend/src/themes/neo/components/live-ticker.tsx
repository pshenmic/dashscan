import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, Radio, Zap } from "lucide-react";
import { DashIcon } from "@/components/dash-icon";
import type { ApiTransaction } from "@/lib/api/types";
import { formatDuffs, sumVOut } from "@/lib/format";

function truncateHash(hash: string, head = 8, tail = 6) {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

function isInstantLocked(tx: ApiTransaction) {
  const v = tx.instantLock;
  return typeof v === "string" ? v.length > 0 : Boolean(v);
}

function TickerItem({ tx }: { tx: ApiTransaction }) {
  const amount = formatDuffs(sumVOut(tx.vOut));
  const locked = isInstantLocked(tx);
  return (
    <Link
      to="/transactions/$hash"
      params={{ hash: tx.hash }}
      className="live-ticker__item group inline-flex items-center gap-2.5 whitespace-nowrap px-4 py-2 transition-colors hover:bg-accent/5"
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-accent/10 text-accent">
        <ArrowLeftRight className="size-3" />
      </span>
      <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground">
        {truncateHash(tx.hash)}
      </span>
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-foreground">
        {amount}
        <DashIcon />
      </span>
      {locked && (
        <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
          <Zap className="size-2.5" />
          IS
        </span>
      )}
    </Link>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="inline-block size-1 shrink-0 rounded-full bg-border"
    />
  );
}

export function LiveTicker({ txs }: { txs: ApiTransaction[] }) {
  const items = txs.slice(0, 5);
  if (items.length === 0) return null;
  return (
    <div className="live-ticker relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
      <div className="absolute left-0 top-0 z-10 flex h-full items-center gap-2 border-r border-border/60 bg-card px-4">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-status-ping rounded-full bg-success" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <Radio className="size-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Live
        </span>
      </div>
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-card to-transparent" />
      <div className="live-ticker__viewport pl-[112px]">
        <div className="live-ticker__track flex w-max items-center">
          {(["a", "b"] as const).map((groupKey) => (
            <div
              key={groupKey}
              className="flex items-center"
              aria-hidden={groupKey === "b"}
            >
              {items.map((tx, j) => (
                <div
                  key={`${groupKey}-${tx.hash}`}
                  className="flex items-center"
                >
                  {j > 0 && <Divider />}
                  <TickerItem tx={tx} />
                </div>
              ))}
              <span className="inline-block w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
