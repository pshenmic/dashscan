import { useEffect, useState } from "react";

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

let cachedFmts: {
  tz: string;
  time: Intl.DateTimeFormat;
  date: Intl.DateTimeFormat;
  parts: Intl.DateTimeFormat;
} | null = null;

function getFmts() {
  if (cachedFmts) return cachedFmts;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  cachedFmts = {
    tz,
    time: new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }),
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: tz,
    }),
    parts: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: tz,
    }),
  };
  return cachedFmts;
}

function getLocalTime() {
  const { tz, time, date, parts: partsFmt } = getFmts();
  const now = new Date();

  const parts: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(now)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }

  return {
    hours: parts.hour ?? 0,
    minutes: parts.minute ?? 0,
    seconds: parts.second ?? 0,
    display: `${time.format(now)} \u2022 ${date.format(now)} (${tz})`,
  };
}

function AnalogClock({
  hours,
  minutes,
  seconds,
}: {
  hours: number;
  minutes: number;
  seconds: number;
}) {
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r="15"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1"
        opacity={0.32}
      />
      <line
        x1="16"
        y1="16"
        x2="16"
        y2="9"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 16 16)`}
      />
      <line
        x1="16"
        y1="16"
        x2="16"
        y2="6"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} 16 16)`}
      />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const [clock, setClock] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    display: string;
  } | null>(null);

  useEffect(() => {
    setClock(getLocalTime());
    const interval = setInterval(() => setClock(getLocalTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="mt-20 h-[88px] bg-transparent">
      <div className="mx-auto flex h-full max-w-[1440px] flex-col items-center justify-between gap-4 rounded-t-3xl border-t border-border px-6 py-4 text-sm text-muted-foreground md:flex-row md:gap-0 md:py-0">
        <div className="flex items-center gap-3">
          <AnalogClock
            hours={clock?.hours ?? 0}
            minutes={clock?.minutes ?? 0}
            seconds={clock?.seconds ?? 0}
          />
          <div className="flex flex-col">
            <span className="font-pixel text-[10px] text-primary/[0.48]">
              pshenmic.dev
            </span>
            <span className="text-xs text-muted-foreground">
              {clock?.display || "\u00A0"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className="flex size-10 items-center justify-center rounded-[12px] bg-primary/[0.04] transition-opacity hover:opacity-80"
            >
              <img src={link.icon} alt="" className="size-5" />
            </a>
          ))}
        </div>

        <p className="m-0 text-sm text-muted-foreground">
          {year} &copy; DashScan Explorer
        </p>
      </div>
    </footer>
  );
}
