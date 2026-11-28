import { CalendarDays } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { type DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;
const PRESETS = [7, 30, 90];
const MAX_DAYS = 90;
const presetClass =
  "min-h-7 rounded-md px-2 text-xs font-medium tabular-nums text-muted-foreground hover:bg-action-subtle hover:text-accent aria-pressed:bg-action-subtle aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring [@media(pointer:coarse)]:min-h-9";

export interface ChartPeriod {
  days: number;
  end?: number;
}

function formatChartPeriod({ days, end }: ChartPeriod) {
  if (end == null) return `${days}D`;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
  const last = formatter.format(end - DAY_MS);
  return days === 1
    ? last
    : `${formatter.format(end - days * DAY_MS)} – ${last}`;
}

export function ChartDateRange({
  value,
  today,
  onChange,
  allSelected = false,
  onSelectAll,
  segmented = false,
}: {
  value: ChartPeriod;
  today: number;
  onChange: (value: ChartPeriod) => void;
  allSelected?: boolean;
  onSelectAll?: () => void;
  segmented?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>();
  const end = value.end ?? today;
  const label = formatChartPeriod(value);
  const days =
    draft?.from && draft.to
      ? Math.round((draft.to.getTime() - draft.from.getTime()) / DAY_MS) + 1
      : 0;

  function apply(period: ChartPeriod) {
    onChange(period);
    setOpen(false);
  }

  return (
    <fieldset
      className={cn(
        "flex min-w-0 max-w-full flex-wrap items-center gap-0.5",
        segmented &&
          "flex-nowrap rounded-xl bg-secondary p-1 [&_button[aria-pressed=true]]:bg-card [&_button[aria-pressed=true]]:font-semibold [&_button[aria-pressed=true]]:text-accent",
      )}
    >
      <legend className="sr-only">Chart date range</legend>
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          aria-label={`Last ${preset} complete UTC ${preset === 1 ? "day" : "days"}`}
          aria-pressed={
            !allSelected && value.end == null && value.days === preset
          }
          className={presetClass}
          onClick={() => apply({ days: preset })}
        >
          {preset}D
        </button>
      ))}
      {onSelectAll && (
        <button
          type="button"
          aria-label="All available dates"
          aria-pressed={allSelected}
          className={presetClass}
          onClick={onSelectAll}
        >
          All
        </button>
      )}
      {segmented && (
        <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
      )}
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next)
            setDraft(
              allSelected
                ? undefined
                : {
                    from: new Date(end - value.days * DAY_MS),
                    to: new Date(end - DAY_MS),
                  },
            );
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              value.end == null
                ? "Choose custom dates"
                : `Chart date range: ${label}`
            }
            aria-pressed={value.end != null}
            className={cn(
              "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-action-subtle hover:text-accent focus-visible:outline-2 focus-visible:outline-ring [@media(pointer:coarse)]:min-h-9",
              value.end != null && "bg-action-subtle text-accent",
            )}
          >
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            {value.end != null && !segmented && <span>{label}</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          collisionPadding={12}
          className="w-auto max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl p-2"
          aria-label="Chart date range"
        >
          <DayPicker
            data-dash-calendar
            mode="range"
            timeZone="UTC"
            selected={draft}
            onSelect={(_next, selectedDay) => {
              if (!draft?.from || draft.to) {
                setDraft({ from: selectedDay });
                return;
              }
              const from = Math.min(
                draft.from.getTime(),
                selectedDay.getTime(),
              );
              const to = Math.max(draft.from.getTime(), selectedDay.getTime());
              const selectedDays = Math.round((to - from) / DAY_MS) + 1;
              setDraft({ from: new Date(from), to: new Date(to) });
              if (selectedDays <= MAX_DAYS) {
                apply({ days: selectedDays, end: to + DAY_MS });
              }
            }}
            defaultMonth={new Date(end - DAY_MS)}
            today={new Date(today)}
            endMonth={new Date(today)}
            disabled={{ after: new Date(today - DAY_MS) }}
            weekStartsOn={1}
            className="text-sm [&_.rdp-day_button]:focus-visible:outline-2 [&_.rdp-day_button]:focus-visible:outline-ring [&_.rdp-day_button]:hover:bg-action-subtle [&_.rdp-range_start_.rdp-day_button]:hover:bg-action-solid [&_.rdp-range_end_.rdp-day_button]:hover:bg-action-solid"
            style={
              {
                "--rdp-accent-color": "var(--action-solid)",
                "--rdp-accent-background-color": "var(--action-subtle)",
                "--rdp-range_start-color": "var(--primary-foreground)",
                "--rdp-range_end-color": "var(--primary-foreground)",
                "--rdp-range_middle-color": "var(--popover-foreground)",
                "--rdp-day-width": "var(--dash-calendar-cell, 30px)",
                "--rdp-day-height": "var(--dash-calendar-cell, 30px)",
                "--rdp-day_button-width": "var(--dash-calendar-button, 28px)",
                "--rdp-day_button-height": "var(--dash-calendar-button, 28px)",
                "--rdp-nav-height": "32px",
                "--rdp-nav_button-width": "28px",
                "--rdp-nav_button-height": "28px",
              } as CSSProperties
            }
          />
          {days > MAX_DAYS && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              Select up to 90 days
            </p>
          )}
        </PopoverContent>
      </Popover>
    </fieldset>
  );
}
