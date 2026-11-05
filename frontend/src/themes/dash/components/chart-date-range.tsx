import { CalendarDays, ChevronDown } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { type DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DAY_MS = 86_400_000;

export interface ChartPeriod {
  days: number;
  end?: number;
}

export function ChartDateRange({
  value,
  today,
  onChange,
}: {
  value: ChartPeriod;
  today: number;
  onChange: (value: ChartPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>();
  const end = value.end ?? today;
  const format = (timestamp: number) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(timestamp);
  const label =
    value.end == null
      ? `${value.days} days`
      : `${format(end - value.days * DAY_MS)} – ${format(end - DAY_MS)}`;
  const days =
    draft?.from && draft.to
      ? Math.round((draft.to.getTime() - draft.from.getTime()) / DAY_MS) + 1
      : 0;
  const valid =
    days >= 1 && days <= 90 && draft?.to != null && draft.to.getTime() < today;

  function apply(period: ChartPeriod) {
    onChange(period);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next)
          setDraft({
            from: new Date(end - value.days * DAY_MS),
            to: new Date(end - DAY_MS),
          });
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Chart date range: ${label}`}
          className="inline-flex max-w-full items-center gap-2 rounded-full bg-action-subtle px-3 py-2 text-xs text-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
          <ChevronDown className="size-3 shrink-0" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-auto max-w-[calc(100vw-1.5rem)] rounded-xl p-3"
        aria-label="Chart date range"
      >
        <div className="mb-3 flex gap-2">
          {[7, 30, 90].map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={value.end == null && value.days === preset}
              className="flex-1 rounded-lg px-3 py-2 text-sm hover:bg-secondary aria-pressed:bg-action-subtle aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => apply({ days: preset })}
            >
              {preset} days
            </button>
          ))}
        </div>
        <DayPicker
          mode="range"
          timeZone="UTC"
          selected={draft}
          onSelect={(next, selectedDay) => {
            setDraft(draft?.from && draft.to ? { from: selectedDay } : next);
          }}
          defaultMonth={new Date(end - DAY_MS)}
          today={new Date(today)}
          endMonth={new Date(today)}
          disabled={{ after: new Date(today - DAY_MS) }}
          weekStartsOn={1}
          className="text-sm"
          style={
            {
              "--rdp-accent-color": "var(--accent)",
              "--rdp-accent-background-color": "var(--action-subtle)",
              "--rdp-range_start-color": "var(--accent-foreground)",
              "--rdp-range_end-color": "var(--accent-foreground)",
              "--rdp-range_middle-color": "var(--popover-foreground)",
              "--rdp-day-width": "38px",
              "--rdp-day-height": "38px",
              "--rdp-day_button-width": "36px",
              "--rdp-day_button-height": "36px",
            } as CSSProperties
          }
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {days > 90 ? "Select up to 90 days" : "UTC · Complete days"}
          </p>
          <button
            type="button"
            disabled={!valid}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => {
              if (valid && draft?.to)
                apply({ days, end: draft.to.getTime() + DAY_MS });
            }}
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
