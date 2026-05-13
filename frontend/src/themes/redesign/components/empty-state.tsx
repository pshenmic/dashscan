import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowRight,
  Box,
  Inbox,
  Search,
  Server,
  Sparkles,
  Wallet,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/themes/redesign/components/copy-button";
import { Badge } from "@/themes/redesign/components/ui/badge";
import { Card, CardContent } from "@/themes/redesign/components/ui/card";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

type NotFoundKind = "block" | "transaction" | "address" | "masternode";

const KIND_CONFIG: Record<
  NotFoundKind,
  {
    label: string;
    icon: typeof Box;
    accent: string;
    halo: string;
    chip: string;
  }
> = {
  block: {
    label: "Block",
    icon: Box,
    accent: "var(--accent)",
    halo: "from-accent/30",
    chip: "bg-accent/15 text-accent",
  },
  transaction: {
    label: "Transaction",
    icon: ArrowLeftRight,
    accent: "var(--accent-violet, var(--accent))",
    halo: "from-accent-violet/30",
    chip: "bg-accent-violet/15 text-accent-violet",
  },
  address: {
    label: "Address",
    icon: Wallet,
    accent: "var(--accent-amber, var(--accent))",
    halo: "from-accent-amber/30",
    chip: "bg-accent-amber/15 text-accent-amber",
  },
  masternode: {
    label: "Masternode",
    icon: Server,
    accent: "var(--accent-teal, var(--accent))",
    halo: "from-accent-teal/30",
    chip: "bg-accent-teal/15 text-accent-teal",
  },
};

export type NotFoundSuggestion = {
  category: string;
  label: string;
  sub?: string;
  to: string;
};

interface NotFoundStateProps {
  kind: NotFoundKind;
  query: string;
  title?: string;
  description?: string;
  suggestions?: NotFoundSuggestion[];
  className?: string;
}

const RECENT_KEY = "dashscan:recent-searches";

function loadRecentsByCategory(category: string): NotFoundSuggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotFoundSuggestion[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r.category === category).slice(0, 4);
  } catch {
    return [];
  }
}

export function NotFoundState({
  kind,
  query,
  title,
  description,
  suggestions,
  className,
}: NotFoundStateProps) {
  const config = KIND_CONFIG[kind];
  const Icon = config.icon;
  const [recents, setRecents] = useState<NotFoundSuggestion[]>([]);

  useEffect(() => {
    setRecents(loadRecentsByCategory(config.label));
  }, [config.label]);

  const merged: NotFoundSuggestion[] =
    suggestions && suggestions.length > 0 ? suggestions : recents;

  return (
    <Card
      variant="floating"
      className={cn("hero-surface overflow-hidden", className)}
    >
      <CardContent className="relative flex flex-col items-center gap-6 py-12 text-center">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-radial opacity-60",
            config.halo,
          )}
          style={{
            background: `radial-gradient(45% 50% at 50% 25%, color-mix(in oklab, ${config.accent} 14%, transparent) 0%, transparent 70%)`,
          }}
        />

        <NotFoundIllustration Icon={Icon} accent={config.accent} />

        <div className="relative z-[1] flex max-w-md flex-col gap-2">
          <Badge
            variant="soft"
            className={cn(
              "mx-auto font-mono uppercase tracking-wider",
              config.chip,
            )}
          >
            <Search className="size-3" />
            404 · {config.label} not found
          </Badge>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {title ?? `We couldn't find that ${config.label.toLowerCase()}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {description ??
              `No ${config.label.toLowerCase()} matched your query on the current network. It may have been removed, or you may be on the wrong network.`}
          </p>
          {query && (
            <div className="mx-auto flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5">
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {query}
              </span>
              <CopyButton value={query} label="value" size="sm" />
            </div>
          )}
        </div>

        {merged.length > 0 && (
          <div className="relative z-[1] flex w-full max-w-md flex-col gap-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3" />
              Did you mean…
            </div>
            <div className="flex flex-col gap-1.5">
              {merged.slice(0, 4).map((s) => (
                <Link
                  key={`${s.category}-${s.to}`}
                  to={s.to}
                  className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-2 text-left transition hover:border-accent/50 hover:bg-accent/5"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {s.label}
                    </span>
                    {s.sub && (
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {s.sub}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="relative z-[1] flex flex-wrap items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/blocks" search={{ page: 1, limit: 10 }}>
              Browse blocks
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotFoundIllustration({
  Icon,
  accent,
}: {
  Icon: typeof Box;
  accent: string;
}) {
  return (
    <div className="relative z-[1] flex h-28 w-28 items-center justify-center">
      <div
        className="absolute inset-0 animate-pulse rounded-full"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklab, ${accent} 22%, transparent), transparent 70%)`,
        }}
      />
      <div
        className="absolute inset-2 rounded-full border border-dashed"
        style={{
          borderColor: `color-mix(in oklab, ${accent} 40%, transparent)`,
        }}
      />
      <div
        className="absolute inset-5 rounded-full"
        style={{
          background: `color-mix(in oklab, ${accent} 8%, transparent)`,
          boxShadow: `inset 0 1px 0 hsla(0,0%,100%,0.18), 0 12px 28px -10px color-mix(in oklab, ${accent} 55%, transparent)`,
        }}
      />
      <Icon
        className="relative size-9"
        style={{ color: accent }}
        strokeWidth={1.5}
      />
      <span
        className="absolute -top-1 left-3 size-1.5 animate-ping rounded-full"
        style={{
          background: `color-mix(in oklab, ${accent} 80%, transparent)`,
        }}
      />
      <span
        className="absolute -bottom-1 right-2 size-1 animate-ping rounded-full"
        style={{
          background: `color-mix(in oklab, ${accent} 60%, transparent)`,
          animationDelay: "600ms",
        }}
      />
    </div>
  );
}
