import { useEffect, useState } from "react";
import { useNow } from "@/components/render-clock";

const SOCIAL_LINKS = [
  {
    href: "https://github.com/pshenmic/dashscan",
    icon: "/icons/socials/github.svg",
    label: "GitHub",
  },
  {
    href: "https://twitter.com/Dashpay",
    icon: "/icons/socials/x.svg",
    label: "X",
  },
  {
    href: "https://discordapp.com/invite/PXbUxJB",
    icon: "/icons/socials/discord.svg",
    label: "Discord",
  },
];

function createFormatters() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    timeZone,
    time: new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }),
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone,
    }),
  };
}

export default function Footer() {
  const now = useNow();
  const year = new Date(now).getUTCFullYear();
  const [formatters, setFormatters] = useState<ReturnType<
    typeof createFormatters
  > | null>(null);
  useEffect(() => setFormatters(createFormatters()), []);
  const parts = formatters?.time.formatToParts(now);
  const time = parts
    ?.filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();
  const period = parts?.find((part) => part.type === "dayPeriod")?.value;

  return (
    <footer className="mx-auto w-full max-w-[1440px] rounded-t-3xl border-t border-border bg-card px-4 py-6 sm:px-8">
      <div className="grid items-center justify-items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex w-full min-w-0 max-w-full items-center gap-4 lg:justify-self-start">
          <span
            aria-hidden="true"
            className="size-8 shrink-0 bg-foreground"
            style={{
              mask: "url(/icons/footer/clock.svg) center / contain no-repeat",
            }}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <span
              role="img"
              aria-label="Pshenmic"
              className="h-2 w-[95px] bg-foreground"
              style={{
                mask: "url(/icons/footer/pshenmic.svg) center / contain no-repeat",
              }}
            />
            <time
              dateTime={formatters ? new Date(now).toISOString() : undefined}
              className="min-h-3 text-xs leading-normal text-muted-foreground [overflow-wrap:anywhere]"
            >
              {formatters ? (
                <>
                  <span className="font-extrabold tabular-nums text-foreground">
                    {time}
                  </span>{" "}
                  {period} • {formatters.date.format(now)} (
                  {formatters.timeZone})
                </>
              ) : (
                <span aria-hidden="true">—</span>
              )}
            </time>
          </div>
        </div>
        <nav
          aria-label="Social links"
          className="flex items-center justify-center gap-2"
        >
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-12 items-center justify-center rounded-xl bg-foreground/4 text-foreground transition-colors hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="sr-only">{link.label} (opens in a new tab)</span>
              <span
                aria-hidden="true"
                className="size-6 bg-current"
                style={{ mask: `url(${link.icon}) center / contain no-repeat` }}
              />
            </a>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground lg:justify-self-end lg:text-right">
          {year} © DashScan Explorer
        </p>
      </div>
    </footer>
  );
}
