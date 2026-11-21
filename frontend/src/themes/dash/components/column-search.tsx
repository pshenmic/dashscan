import { ArrowDown, ArrowUp, ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ColumnSearch({
  kind,
  label,
  activeValue,
  onChange,
  sorting,
}: {
  kind: "height" | "hash";
  label: string;
  activeValue?: string;
  onChange: (value: string | undefined) => void;
  sorting?: {
    order: "asc" | "desc";
    onChange: (order: "asc" | "desc") => void;
  };
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);
  const [composing, setComposing] = useState(false);
  const normalized = value.trim().replace(/^#/, "").replace(/\s/g, "");
  const valid =
    kind === "height"
      ? /^\d+$/.test(normalized) && Number.isSafeInteger(Number(normalized))
      : /^[a-f\d]{64}$/i.test(normalized);
  const nextValue = !normalized
    ? undefined
    : kind === "height"
      ? String(Number(normalized))
      : normalized.toLowerCase();
  const hint =
    normalized && !valid
      ? kind === "height"
        ? "Enter a non-negative whole number."
        : "Enter all 64 hexadecimal characters."
      : "";

  const applyValue = useCallback(() => {
    if (
      !dirty ||
      composing ||
      (normalized && !valid) ||
      nextValue === activeValue
    )
      return;
    onChange(nextValue);
  }, [dirty, composing, normalized, valid, nextValue, activeValue, onChange]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(applyValue, 400);
    return () => clearTimeout(timer);
  }, [open, applyValue]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setDirty(false);
        setComposing(false);
        if (next) setValue(activeValue ?? "");
      }}
    >
      <span className="inline-flex items-center gap-1">
        <span>{label}</span>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${sorting ? "Sort and filter" : "Filter"}: ${label}`}
            className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-action-subtle hover:text-accent focus-visible:outline-2 focus-visible:outline-ring ${activeValue || sorting?.order === "asc" || open ? "bg-action-subtle text-accent" : "text-muted-foreground"}`}
          >
            <ChevronDown className="size-3" aria-hidden="true" />
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent
        align="start"
        className="w-56 max-w-[calc(100vw-2rem)] rounded-xl p-3"
      >
        {sorting && (
          <fieldset
            aria-label="Sort height"
            className="mb-2 grid grid-cols-2 gap-1 border-b border-border pb-2"
          >
            {(["asc", "desc"] as const).map((order) => (
              <button
                key={order}
                type="button"
                aria-pressed={sorting.order === order}
                onClick={() => {
                  sorting.onChange(order);
                  setOpen(false);
                }}
                className="flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs hover:bg-secondary aria-pressed:bg-action-subtle aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                {order === "asc" ? (
                  <ArrowUp className="size-3 shrink-0" aria-hidden="true" />
                ) : (
                  <ArrowDown className="size-3 shrink-0" aria-hidden="true" />
                )}
                {order === "asc" ? "Ascending" : "Descending"}
              </button>
            ))}
          </fieldset>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyValue();
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            {label}
          </label>
          <div className="flex items-center rounded-lg border border-input bg-secondary text-popover-foreground focus-within:ring-2 focus-within:ring-ring">
            <input
              id={inputId}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setDirty(true);
              }}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              placeholder={label}
              inputMode={kind === "height" ? "numeric" : "text"}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={hint ? `${inputId}-hint` : undefined}
              className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            {value && (
              <button
                type="button"
                aria-label={`Clear ${label.toLowerCase()} input`}
                onClick={() => {
                  setValue("");
                  setDirty(true);
                }}
                className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          {hint && (
            <p
              id={`${inputId}-hint`}
              className="mt-2 text-xs text-muted-foreground"
            >
              {hint}
            </p>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}
